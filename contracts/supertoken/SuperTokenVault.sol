pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "./Base.sol";
import "../interfaces/IHook.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract SuperTokenVault is Base {
    using SafeTransferLib for ERC20;

    ERC20 public immutable token__;

    // bridge contract address which provides AMB support
    IMessageBridge public bridge__;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // connector => cache
    mapping(address => bytes) public connectorCache;

    // // siblingChainSlug => amount
    // mapping(uint32 => uint256) public siblingPendingMints;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error MessageIdMisMatched();
    error NotMessageBridge();
    error InvalidSiblingChainSlug();
    error NoPendingData();
    error CannotTransferOrExecuteOnBridgeContracts();
    error InvalidTokenContract();
    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when message bridge is updated
    event MessageBridgeUpdated(address newBridge);
    // emitted when message hook is updated
    event HookUpdated(address newHook);
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
        uint256 unlockAmount,
        uint256 totalAmount,
        bytes32 identifier
    );

    event PendingTokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 unlockAmount,
        // uint256 pendingAmount,
        bytes32 identifier
    );

    /**
     * @notice constructor for creating a new SuperTokenVault.
     * @param token_ token contract address which is to be bridged.
     * @param owner_ owner of this contract
     * @param bridge_ message bridge address
     */
    constructor(
        address token_,
        address owner_,
        address bridge_,
        address hook_
    ) AccessControl(owner_) {
        if (token_.code.length == 0) revert InvalidTokenContract();
        token__ = ERC20(token_);
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
     * @notice this function is used to update hook
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param hook_ new hook address
     */
    function updateHook(address hook_) external onlyOwner {
        hook__ = IHook(hook_);
        emit HookUpdated(hook_);
    }

    /**
     * @notice this function is called by users to bridge their funds to a sibling chain
     * @dev it is payable to receive message bridge fees to be paid.
     * @param receiver_ address receiving bridged tokens
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param amount_ amount bridged
     * @param msgGasLimit_ min gas limit needed for execution at destination
     * @param options_ additional message bridge options can be provided using this param
     */
    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 amount_,
        uint256 msgGasLimit_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable nonReentrant {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        if (amount_ == 0) revert ZeroAmount();

        address finalReceiver = receiver_;
        uint256 finalAmount = amount_;
        bytes memory extraData = payload_;

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, extraData) = hook__.srcHookCall(
                receiver_,
                amount_,
                siblingChainSlug_,
                address(bridge__),
                msg.sender,
                payload_
            );
        }
        token__.safeTransferFrom(msg.sender, address(this), finalAmount);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);

        // important to get message id as it is used as an
        // identifier for pending amount and payload caching
        bytes32 returnedMessageId = bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(finalReceiver, finalAmount, messageId, extraData),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();
        // emit TokensDeposited(
        //     siblingChainSlug_,
        //     msg.sender,
        //     receiver_,
        //     amount_,
        //     messageId
        // );
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
            uint256 unlockAmount,
            bytes32 identifier,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        if (
            receiver == address(this) ||
            receiver == address(bridge__) ||
            receiver == address(token__)
        ) revert CannotTransferOrExecuteOnBridgeContracts();

        address finalReceiver = receiver;
        uint256 finalAmount = unlockAmount;
        bytes memory postHookData = new bytes(0);
        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, postHookData) = hook__.dstPreHookCall(
                receiver,
                unlockAmount,
                siblingChainSlug_,
                address(bridge__),
                extraData,
                connectorCache[address(bridge__)]
            );
        }
        token__.safeTransfer(receiver, finalAmount);
        if (address(hook__) != address(0)) {
            (
                bytes memory newIdentifierCache,
                bytes memory newSiblingCache
            ) = hook__.dstPostHookCall(
                    finalReceiver,
                    unlockAmount,
                    siblingChainSlug_,
                    address(bridge__),
                    extraData,
                    postHookData,
                    connectorCache[address(bridge__)]
                );

            identifierCache[identifier] = newIdentifierCache;
            connectorCache[address(bridge__)] = newSiblingCache;
        }
        // emit TokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     amount,
        //     unlockAmount,
        //     identifier
        // );
    }

    function retry(
        uint32 siblingChainSlug_,
        bytes32 identifier_
    ) external nonReentrant {
        bytes memory idCache = identifierCache[identifier_];
        bytes memory connCache = connectorCache[address(bridge__)];

        if (idCache.length == 0) revert NoPendingData();
        (
            address receiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        ) = hook__.preRetryHook(
                siblingChainSlug_,
                address(bridge__),
                idCache,
                connCache
            );

        token__.safeTransfer(receiver, consumedAmount);

        (
            bytes memory newIdentifierCache,
            bytes memory newConnectorCache
        ) = hook__.postRetryHook(
                siblingChainSlug_,
                address(bridge__),
                idCache,
                connCache,
                postRetryHookData
            );
        identifierCache[identifier_] = newIdentifierCache;
        connectorCache[address(bridge__)] = newConnectorCache;

        // emit PendingTokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     consumedAmount,
        //     identifier
        // );
    }
}
