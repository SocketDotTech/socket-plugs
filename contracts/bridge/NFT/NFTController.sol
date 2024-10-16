// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./NFTBase.sol";
import {IMintableERC721} from "../../interfaces/IMintableERC721.sol";
import {IMintableERC1155} from "../../interfaces/IMintableERC1155.sol";

contract NFTController is NFTBase {
    mapping(uint256 => uint256) public totalMinted;
    bytes4 private interfaceId;

    constructor(address token_, bytes4 interfaceId_) NFTBase(token_) {
        if (interfaceId_ != ID_ERC721 && interfaceId_ != ID_ERC1155)
            revert InvalidTokenContract();
        bridgeType = NORMAL_CONTROLLER;
        interfaceId = interfaceId_;
    }

    /**
     * @notice Bridges tokens between chains.
     * @dev This function allows bridging tokens between different chains.
     * @param receiver_ The address to receive the bridged tokens.
     * @param tokenOwner_ The owner address of tokens to bridge.
     * @param tokenId_ The id of token to bridge.
     * @param amount_ The amount of tokens to bridge.
     * @param msgGasLimit_ The gas limit for the execution of the bridging process.
     * @param connector_ The address of the connector contract responsible for the bridge.
     * @param extraData_ The extra data passed to hook functions.
     * @param options_ Additional options for the bridging process.
     */
    function bridge(
        address receiver_,
        address tokenOwner_,
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

        // to maintain socket dl specific accounting for super token
        totalMinted[transferInfo.tokenId] -= transferInfo.amount;
        _burn(tokenOwner_, transferInfo.tokenId, transferInfo.amount);
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
            uint256 lockAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, uint256, bytes32, bytes));

        // convert to shares
        NFTTransferInfo memory transferInfo = NFTTransferInfo(
            receiver,
            tokenId,
            lockAmount,
            extraData
        );
        bytes memory postHookData;
        (postHookData, transferInfo) = _beforeMint(
            siblingChainSlug_,
            transferInfo
        );

        _mint(transferInfo.receiver, transferInfo.tokenId, transferInfo.amount);
        totalMinted[transferInfo.tokenId] += transferInfo.amount;

        _afterMint(lockAmount, messageId, postHookData, transferInfo, true);
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
        _mint(transferInfo.receiver, transferInfo.tokenId, transferInfo.amount);
        totalMinted[transferInfo.tokenId] += transferInfo.amount;

        _afterRetry(connector_, messageId_, postHookData);
    }

    function _burn(
        address user_,
        uint256 burnTokenId_,
        uint256 burnAmount_
    ) internal virtual {
        if (interfaceId == ID_ERC721) {
            IMintableERC721(token).burn(user_, burnTokenId_);
        } else {
            IMintableERC1155(token).burn(user_, burnTokenId_, burnAmount_);
        }
    }

    function _mint(
        address user_,
        uint256 mintTokenId_,
        uint256 mintAmount_
    ) internal virtual {
        if (mintAmount_ == 0) return;
        if (interfaceId == ID_ERC721) {
            IMintableERC721(token).mint(user_, mintTokenId_);
        } else {
            IMintableERC1155(token).mint(user_, mintTokenId_, mintAmount_);
        }
    }
}
