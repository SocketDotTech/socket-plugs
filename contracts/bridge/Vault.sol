// SPDX-License-Identifier: MIT
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

    // /**
    //  * @notice constructor for creating a new SuperTokenVault.
    //  * @param token_ token contract address which is to be bridged.
    //  */

    constructor(address token_) Base(token_) {
        bridgeType = token_ == ETH_ADDRESS ? NATIVE_VAULT : ERC20_VAULT;
    }

    /**
     * @notice Bridges tokens between chains.
     * @dev This function allows bridging tokens between different chains.
     * @param receiver_ The address to receive the bridged tokens.
     * @param amount_ The amount of tokens to bridge.
     * @param msgGasLimit_ The gas limit for the execution of the bridging process.
     * @param connector_ The address of the connector contract responsible for the bridge.
     * @param extraData_ The extra data passed to hook functions.
     * @param options_ Additional options for the bridging process.
     */
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata extraData_,
        bytes calldata options_
    ) public payable nonReentrant {
        (
            TransferInfo memory transferInfo,
            bytes memory postHookData
        ) = _beforeBridge(
                connector_,
                TransferInfo(receiver_, amount_, extraData_)
            );

        _receiveTokens(transferInfo.amount);

        _afterBridge(
            msgGasLimit_,
            connector_,
            options_,
            postHookData,
            transferInfo
        );
    }

    /**
     * @notice Bridges tokens between chains with permit.
     * @dev This function allows bridging tokens between different chains.
     * @param receiver_ The address to receive the bridged tokens.
     * @param amount_ The amount of tokens to bridge.
     * @param msgGasLimit_ The gas limit for the execution of the bridging process.
     * @param connector_ The address of the connector contract responsible for the bridge.
     * @param extraData_ The extra data passed to hook functions.
     * @param options_ Additional options for the bridging process.
     * @param deadline_  The deadline for the permit signature.
     * @param v_  The recovery id of the permit signature.
     * @param r_  The r value of the permit signature.
     * @param s_  The s value of the permit signature.
     */
    function bridgeWithPermit(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_,
        uint256 deadline_,
        uint8 v_,
        bytes32 r_,
        bytes32 s_
    ) external payable {

        try ERC20(token).permit(msg.sender, address(this), amount_, deadline_, v_, r_, s_) {
            bridge(receiver_, amount_, msgGasLimit_, connector_, execPayload_, options_);
        } catch {
            bridge(receiver_, amount_, msgGasLimit_, connector_, extraData_, options_);
        }
    }

    /**
     * @notice Receives inbound tokens from another chain.
     * @dev This function is used to receive tokens from another chain.
     * @param siblingChainSlug_ The identifier of the sibling chain.
     * @param payload_ The payload containing the inbound tokens.
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

        _transferTokens(transferInfo.receiver, transferInfo.amount);

        _afterMint(unlockAmount, messageId, postHookData, transferInfo);
    }

    /**
     * @notice Retry a failed transaction.
     * @dev This function allows retrying a failed transaction sent through a connector.
     * @param connector_ The address of the connector contract responsible for the failed transaction.
     * @param messageId_ The unique identifier of the failed transaction.
     */
    function retry(
        address connector_,
        bytes32 messageId_
    ) external nonReentrant {
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = _beforeRetry(connector_, messageId_);
        _transferTokens(transferInfo.receiver, transferInfo.amount);

        _afterRetry(connector_, messageId_, postHookData);
    }

    /**
     * @notice Disperse rewards, will be used for dispersing rewards in the future.
     * @dev reward token can not be locked token.
     * @param receiver_ The address to receive the rewards.
     * @param amount_ The amount of rewards to disperse.
     * @param rewardToken_ The address of the reward token.
     */
    function disperseRewards(address receiver_, uint256 amount_, address rewardToken_) external onlyOwner {
        if (rewardToken_ == token) revert("Vault: reward token is same as token");
        ERC20(rewardToken_).safeTransfer(receiver_, amount_);
    }


    function _transferTokens(address receiver_, uint256 amount_) internal {
        if (amount_ == 0) return;
        if (address(token) == ETH_ADDRESS) {
            SafeTransferLib.safeTransferETH(receiver_, amount_);
        } else {
            ERC20(token).safeTransfer(receiver_, amount_);
        }
    }

    function _receiveTokens(uint256 amount_) internal {
        if (amount_ == 0 || address(token) == ETH_ADDRESS) return;
        ERC20(token).safeTransferFrom(msg.sender, address(this), amount_);
    }
}
