pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "./controllers/ControllerBase.sol";
import "./interfaces/IHook.sol";
import "./interfaces/IConnector.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract Vault is ControllerBase {
    using SafeTransferLib for ERC20;

    // // siblingChainSlug => amount
    // mapping(uint32 => uint256) public siblingPendingMints;

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

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

    // /**
    //  * @notice constructor for creating a new SuperTokenVault.
    //  * @param token_ token contract address which is to be bridged.
    //  */

    constructor(address token_, address owner_) AccessControl(owner_) {
        if (token_.code.length == 0) revert InvalidTokenContract();
        token__ = ERC20(token_);
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
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_
    ) external payable nonReentrant {
        TransferInfo memory transferInfo = _beforeBridge(
            connector_,
            TransferInfo(receiver_, amount_, execPayload_)
        );

        token__.safeTransferFrom(
            msg.sender,
            address(this),
            transferInfo.amount
        );

        _afterBridge(msgGasLimit_, connector_, options_, transferInfo);
    }

    /**
     * @notice this function receives the message from message bridge
     * @dev Only bridge can call this function.
     * @param payload_ payload which is decoded to get `receiver`, `amount to mint`, `message id` and `payload` to execute after token transfer.
     */
    function receiveInbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
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

        TransferInfo memory transferInfo = TransferInfo(
            receiver,
            unlockAmount,
            extraData
        );
        bytes memory postHookData = bytes("");
        if (address(hook__) != address(0)) {
            (postHookData, transferInfo) = hook__.dstPreHookCall(
                DstPreHookCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    transferInfo
                )
            );
        }

        token__.safeTransfer(transferInfo.receiver, transferInfo.amount);

        if (address(hook__) != address(0)) {
            CacheData memory cacheData = hook__.dstPostHookCall(
                DstPostHookCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    postHookData,
                    transferInfo
                )
            );

            identifierCache[identifier] = cacheData.identifierCache;
            connectorCache[msg.sender] = cacheData.connectorCache;
        }
    }

    function retry(
        address connector_,
        bytes32 identifier_
    ) external nonReentrant {
        if (!validConnectors[connector_]) revert NotMessageBridge();

        CacheData memory cacheData = CacheData(
            identifierCache[identifier_],
            connectorCache[connector_]
        );

        if (cacheData.identifierCache.length == 0) revert NoPendingData();
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = hook__.preRetryHook(PreRetryHookCallParams(connector_, cacheData));

        token__.safeTransfer(transferInfo.receiver, transferInfo.amount);

        (cacheData) = hook__.postRetryHook(
            PostRetryHookCallParams(connector_, postRetryHookData, cacheData)
        );
        identifierCache[identifier_] = cacheData.identifierCache;
        connectorCache[connector_] = cacheData.connectorCache;

        // emit PendingTokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     consumedAmount,
        //     identifier
        // );
    }
}
