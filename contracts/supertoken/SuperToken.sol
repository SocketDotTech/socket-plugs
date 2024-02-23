pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./Base.sol";
import "./interfaces/IHook.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract SuperToken is ERC20, Base {
    // bridge contract address which provides AMB support
    IMessageBridge public bridge__;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // sibling chain => cache
    mapping(uint32 => bytes) public siblingChainCache;

    // // siblingChainSlug => amount
    // mapping(uint32 => uint256) public siblingPendingMints;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error MessageIdMisMatched();
    error NotMessageBridge();
    error InvalidSiblingChainSlug();
    error NoPendingData();

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when message bridge is updated
    event MessageBridgeUpdated(address newBridge);
    // emitted at source when tokens are bridged to a sibling chain
    event BridgeTokens(
        uint32 siblingChainSlug,
        address withdrawer,
        address receiver,
        uint256 bridgedAmount,
        bytes32 identifier
    );

    // emitted when pending tokens are minted as limits are replenished
    event TokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 totalAmount,
        bytes32 identifier
    );

    event PendingTokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        // uint256 pendingAmount,
        bytes32 identifier
    );

    /**
     * @notice constructor for creating a new SuperToken.
     * @param name_ token name
     * @param symbol_ token symbol
     * @param decimals_ token decimals (should be same on all chains)
     * @param initialSupplyHolder_ address to which initial supply will be minted
     * @param owner_ owner of this contract
     * @param initialSupply_ initial supply of super token
     * @param bridge_ message bridge address
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialSupplyHolder_,
        address owner_,
        uint256 initialSupply_,
        address bridge_,
        address hook_
    ) ERC20(name_, symbol_, decimals_) AccessControl(owner_) {
        _mint(initialSupplyHolder_, initialSupply_);
        bridge__ = IMessageBridge(bridge_);
        hook__ = IHook(hook_);
    }

    /**
     * @notice this function is used to update message bridge
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param bridge_ new bridge address
     */
    function updateMessageBridge(address bridge_) external onlyOwner {
        bridge__ = IMessageBridge(bridge_);
        emit MessageBridgeUpdated(bridge_);
    }

    /**
     * @notice this function is called by users to bridge their funds to a sibling chain
     * @dev it is payable to receive message bridge fees to be paid.
     * @param receiver_ address receiving bridged tokens
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param sendingAmount_ amount bridged
     * @param msgGasLimit_ min gas limit needed for execution at destination
     * @param options_ additional message bridge options can be provided using this param
     */
    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 sendingAmount_,
        uint256 msgGasLimit_,
        bytes calldata options_
    ) external payable {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        if (sendingAmount_ == 0) revert ZeroAmount();

        (address receiver, uint256 amount, bytes memory extraData) = hook__
            .srcHookCall(
                receiver_,
                sendingAmount_,
                siblingChainSlug_,
                address(bridge__),
                msg.sender,
                options_
            );
        _burn(msg.sender, amount);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);

        // important to get message id as it is used as an
        // identifier for pending amount and payload caching
        bytes32 returnedMessageId = bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(receiver_, sendingAmount_, messageId, extraData),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();
        emit BridgeTokens(
            siblingChainSlug_,
            msg.sender,
            receiver_,
            sendingAmount_,
            messageId
        );
    }

    /**
     * @notice this function receives the message from message bridge
     * @dev Only bridge can call this function.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param payload_ payload which is decoded to get `receiver`, `amount to mint`, `message id` and `payload` to execute after token transfer.
     */
    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
        if (msg.sender != address(bridge__)) revert NotMessageBridge();

        (
            address receiver,
            uint256 mintAmount,
            bytes32 identifier,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (
            address tokenReceiver,
            uint256 amount,
            bytes memory postHookData
        ) = hook__.dstPreHookCall(
                receiver,
                mintAmount,
                siblingChainSlug_,
                address(bridge__),
                extraData,
                siblingChainCache[siblingChainSlug_]
            );

        _mint(receiver, amount);

        (bytes memory newIdentifierCache, bytes memory newSiblingCache) = hook__
            .dstPostHookCall(
                receiver,
                mintAmount,
                siblingChainSlug_,
                address(bridge__),
                extraData,
                postHookData,
                siblingChainCache[siblingChainSlug_]
            );

        identifierCache[identifier] = newIdentifierCache;
        siblingChainCache[siblingChainSlug_] = newSiblingCache;
        // emit TokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     amount,
        //     mintAmount,
        //     identifier
        // );
    }

    function retry(uint32 siblingChainSlug_, bytes32 identifier) external {
        bytes memory idCache = identifierCache[identifier];
        if (idCache.length == 0) revert NoPendingData();
        (
            address receiver,
            uint256 consumedAmount,
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache
        ) = hook__.retry(
                siblingChainSlug_,
                idCache,
                siblingChainCache[siblingChainSlug_]
            );

        identifierCache[identifier] = newIdentifierCache;
        siblingChainCache[siblingChainSlug_] = newSiblingChainCache;

        _mint(receiver, consumedAmount);

        emit PendingTokensBridged(
            siblingChainSlug_,
            receiver,
            consumedAmount,
            identifier
        );
    }
}
