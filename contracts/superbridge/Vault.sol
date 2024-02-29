pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "./SuperBridgeBase.sol";
import "../interfaces/IHook.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract Vault is SuperBridgeBase {
    using SafeTransferLib for ERC20;

    ERC20 public immutable token__;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // sibling chain => cache
    mapping(address => bytes) public connectorCache;

    mapping(address => bool) public validConnectors;
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
    event ConnectorStatusUpdated(address connector, bool status);
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
     * @param hook_ hook address
     */
    constructor(address token_, address hook_) AccessControl(msg.sender) {
        if (token_.code.length == 0) revert InvalidTokenContract();
        token__ = ERC20(token_);
        hook__ = IHook(hook_);
    }

    /**
     * @notice this function is used to update hook
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param hook_ new hook address
     */
    function updateHook(address hook_, bool approveToken_) external onlyOwner {
        hook__ = IHook(hook_);
        if (approveToken_) token__.approve(hook_, type(uint256).max);
        emit HookUpdated(hook_);
    }

    function updateConnectorStatus(
        address[] calldata connectors,
        bool[] calldata statuses
    ) external onlyOwner {
        uint256 length = connectors.length;
        for (uint256 i; i < length; i++) {
            validConnectors[connectors[i]] = statuses[i];
            emit ConnectorStatusUpdated(connectors[i], statuses[i]);
        }
    }

    // /**
    //  * @notice this function is called by users to bridge their funds to a sibling chain
    //  * @dev it is payable to receive message bridge fees to be paid.
    //  * @param receiver_ address receiving bridged tokens
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param sendingAmount_ amount bridged
    //  * @param msgGasLimit_ min gas limit needed for execution at destination
    //  * @param options_ additional message bridge options can be provided using this param
    //  */
    function depositToAppChain(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_
    ) external payable nonReentrant {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        if (amount_ == 0) revert ZeroAmount();

        address finalReceiver = receiver_;
        uint256 finalAmount = amount_;
        bytes memory extraData = execPayload_;

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, extraData) = hook__.srcHookCall(
                receiver_,
                amount_,
                IConnector(connector_).siblingChainSlug(),
                connector_,
                msg.sender,
                execPayload_
            );
        }
        token__.safeTransferFrom(msg.sender, address(this), finalAmount);

        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            abi.encode(finalReceiver, finalAmount, messageId, extraData)
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
     * @param payload_ payload which is decoded to get `receiver`, `amount to mint`, `message id` and `payload` to execute after token transfer.
     */
    function receiveInbound(
        bytes memory payload_
    ) external override nonReentrant {
        if (!validConnectors[msg.sender]) revert NotMessageBridge();
        (
            address receiver,
            uint256 unlockAmount,
            bytes32 identifier,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        if (
            receiver == address(this) ||
            // receiver == address(bridge__) ||
            receiver == address(token__)
        ) revert CannotTransferOrExecuteOnBridgeContracts();

        address finalReceiver = receiver;
        uint256 finalAmount = unlockAmount;
        bytes memory postHookData = new bytes(0);

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, postHookData) = hook__.dstPreHookCall(
                receiver,
                unlockAmount,
                IConnector(msg.sender).siblingChainSlug(),
                msg.sender,
                extraData,
                connectorCache[msg.sender]
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
                    IConnector(msg.sender).siblingChainSlug(),
                    msg.sender,
                    extraData,
                    postHookData,
                    connectorCache[msg.sender]
                );

            identifierCache[identifier] = newIdentifierCache;
            connectorCache[msg.sender] = newSiblingCache;
        }
    }

    function retry(
        address connector_,
        bytes32 identifier_
    ) external nonReentrant {
        bytes memory idCache = identifierCache[identifier_];
        bytes memory connCache = connectorCache[connector_];

        if (idCache.length == 0) revert NoPendingData();
        (
            address receiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        ) = hook__.preRetryHook(
                IConnector(msg.sender).siblingChainSlug(),
                connector_,
                idCache,
                connCache
            );

        token__.safeTransfer(receiver, consumedAmount);

        (
            bytes memory newIdentifierCache,
            bytes memory newConnectorCache
        ) = hook__.postRetryHook(
                IConnector(msg.sender).siblingChainSlug(),
                connector_,
                idCache,
                connCache,
                postRetryHookData
            );
        identifierCache[identifier_] = newIdentifierCache;
        connectorCache[connector_] = newConnectorCache;

        // emit PendingTokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     consumedAmount,
        //     identifier
        // );
    }
}
