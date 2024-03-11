pragma solidity 0.8.13;

import "./Base.sol";
import "../interfaces/IConnector.sol";
import "solmate/tokens/ERC20.sol";

/**
 * @title SuperToken
 * @notice A contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract Vault is Base {
    using SafeTransferLib for ERC20;
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

    constructor(address token_) Base(token_) {}

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
        (
            TransferInfo memory transferInfo,
            bytes memory postHookData
        ) = _beforeBridge(
                connector_,
                TransferInfo(receiver_, amount_, execPayload_)
            );

        if (transferInfo.amount != 0)
            ERC20(token).safeTransferFrom(
                msg.sender,
                address(this),
                transferInfo.amount
            );

        _afterBridge(
            msgGasLimit_,
            connector_,
            options_,
            postHookData,
            transferInfo
        );
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
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        TransferInfo memory transferInfo = TransferInfo(
            receiver,
            unlockAmount,
            extraData
        );

        bytes memory postHookData;
        (postHookData, transferInfo) = _beforeMint(
            siblingChainSlug_,
            transferInfo
        );

        if (transferInfo.amount != 0)
            ERC20(token).safeTransfer(
                transferInfo.receiver,
                transferInfo.amount
            );

        _afterMint(unlockAmount, messageId, postHookData, transferInfo);
        emit TokensMinted(
            msg.sender,
            transferInfo.receiver,
            transferInfo.amount,
            messageId
        );
    }

    function retry(
        address connector_,
        bytes32 messageId_
    ) external nonReentrant {
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = _beforeRetry(connector_, messageId_);

        if (transferInfo.amount != 0)
            ERC20(token).safeTransfer(
                transferInfo.receiver,
                transferInfo.amount
            );

        _afterRetry(connector_, messageId_, postRetryHookData);
    }
}
