// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./NFTBase.sol";
import "../../interfaces/IConnector.sol";
import "solmate/tokens/ERC721.sol";
import "solmate/tokens/ERC1155.sol";

/**
 * @title SuperToken
 * @notice A contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract NFTVault is NFTBase {
    /**
     * @notice constructor for creating a new SuperTokenVault.
     * @param token_ token contract address which is to be bridged.
     * @param interfaceId_ EIP-165 interface id of token contract which is to be bridged.
     */

    constructor(address token_, bytes4 interfaceId_) NFTBase(token_) {
        if (interfaceId_ != ID_ERC721 && interfaceId_ != ID_ERC1155)
            revert InvalidTokenContract();
        bridgeType = interfaceId_ == ID_ERC721 ? ERC721_VAULT : ERC1155_VAULT;
    }

    /**
     * @notice Bridges tokens between chains.
     * @dev This function allows bridging tokens between different chains.
     * @param receiver_ The address to receive the bridged tokens.
     * @param tokenId_ The id of token to bridge.
     * @param amount_ The amount of tokens to bridge.
     * @param msgGasLimit_ The gas limit for the execution of the bridging process.
     * @param connector_ The address of the connector contract responsible for the bridge.
     * @param extraData_ The extra data passed to hook functions.
     * @param options_ Additional options for the bridging process.
     */
    function bridge(
        address receiver_,
        uint256 tokenId_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata extraData_,
        bytes calldata options_
    ) external payable nonReentrant {
        (
            NFTTransferInfo memory transferInfo,
            bytes memory postHookData
        ) = _beforeBridge(
                connector_,
                NFTTransferInfo(receiver_, tokenId_, amount_, extraData_)
            );

        _receiveTokens(transferInfo.tokenId, transferInfo.amount);

        _afterBridge(
            msgGasLimit_,
            connector_,
            options_,
            postHookData,
            transferInfo
        );
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
            uint256 tokenId,
            uint256 unlockAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, uint256, bytes32, bytes));

        NFTTransferInfo memory transferInfo = NFTTransferInfo(
            receiver,
            tokenId,
            unlockAmount,
            extraData
        );

        bytes memory postHookData;
        (postHookData, transferInfo) = _beforeMint(
            siblingChainSlug_,
            transferInfo
        );

        _transferTokens(
            transferInfo.receiver,
            transferInfo.tokenId,
            transferInfo.amount
        );

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
            NFTTransferInfo memory transferInfo
        ) = _beforeRetry(connector_, messageId_);
        _transferTokens(
            transferInfo.receiver,
            transferInfo.tokenId,
            transferInfo.amount
        );

        _afterRetry(connector_, messageId_, postHookData);
    }

    function _transferTokens(
        address receiver_,
        uint256 tokenId_,
        uint256 amount_
    ) internal {
        if (amount_ == 0) return;
        if (bridgeType == ERC721_VAULT) {
            ERC721(token).safeTransferFrom(address(this), receiver_, tokenId_);
        } else {
            ERC1155(token).safeTransferFrom(
                address(this),
                receiver_,
                tokenId_,
                amount_,
                new bytes(0)
            );
        }
    }

    function _receiveTokens(uint256 tokenId_, uint256 amount_) internal {
        if (amount_ == 0) return;
        if (bridgeType == ERC721_VAULT) {
            ERC721(token).safeTransferFrom(msg.sender, address(this), tokenId_);
        } else {
            ERC1155(token).safeTransferFrom(
                msg.sender,
                address(this),
                tokenId_,
                amount_,
                new bytes(0)
            );
        }
    }
}
