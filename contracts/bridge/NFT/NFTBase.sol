// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "solmate/tokens/ERC721.sol";
import "solmate/tokens/ERC1155.sol";
import {IConnector} from "../../interfaces/IConnector.sol";
import "../../interfaces/INFTHook.sol";
import "../../interfaces/INFTBridge.sol";
import "../../interfaces/INFTMetadata.sol";
import "../../common/Errors.sol";
import "../../common/Constants.sol";
import "../../utils/AccessControl.sol";

abstract contract NFTBase is ReentrancyGuard, INFTBridge, AccessControl {
    address public immutable token;
    bytes32 public bridgeType;
    INFTHook public hook__;
    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // connector => cache
    mapping(address => bytes) public connectorCache;

    mapping(address => bool) public validConnectors;

    event ConnectorStatusUpdated(address connector, bool status);

    event HookUpdated(address newHook);

    event BridgingTokens(
        address connector,
        address sender,
        address receiver,
        uint256 tokenId,
        uint256 amount,
        bytes32 messageId
    );
    event TokensBridged(
        address connecter,
        address receiver,
        uint256 tokenId,
        uint256 amount,
        bytes32 messageId
    );

    constructor(address token_) AccessControl(msg.sender) {
        if (token_ != ETH_ADDRESS && token_.code.length == 0)
            revert InvalidTokenContract();
        token = token_;
    }

    /**
     * @notice this function is used to update hook
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param hook_ new hook address
     */
    function updateHook(
        address hook_,
        bool approve_
    ) external virtual onlyOwner {
        // remove the approval from the old hook
        if (bridgeType == ERC721_VAULT) {
            if (
                ERC721(token).isApprovedForAll(address(this), address(hook__))
            ) {
                ERC721(token).setApprovalForAll(address(hook__), false);
            }
            if (approve_) {
                ERC721(token).setApprovalForAll(hook_, approve_);
            }
        } else {
            if (
                ERC1155(token).isApprovedForAll(address(this), address(hook__))
            ) {
                ERC1155(token).setApprovalForAll(address(hook__), false);
            }
            if (approve_) {
                ERC1155(token).setApprovalForAll(hook_, approve_);
            }
        }
        hook__ = INFTHook(hook_);

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

    /**
     * @notice Executes pre-bridge operations before initiating a token bridge transfer.
     * @dev This internal function is called before initiating a token bridge transfer.
     * It validates the receiver address and the connector, and if a pre-hook contract is defined,
     * it executes the source pre-hook call.
     * @param connector_ The address of the connector responsible for the transfer.
     * @param transferInfo_ Information about the transfer.
     * @return transferInfo Information about the transfer after pre-bridge operations.
     * @return postHookData Data returned from the pre-hook call.
     * @dev Reverts with `ZeroAddressReceiver` if the receiver address is zero.
     * Reverts with `InvalidConnector` if the connector address is not valid.
     */
    function _beforeBridge(
        address connector_,
        NFTTransferInfo memory transferInfo_
    )
        internal
        returns (NFTTransferInfo memory transferInfo, bytes memory postHookData)
    {
        if (transferInfo_.receiver == address(0)) revert ZeroAddressReceiver();
        if (!validConnectors[connector_]) revert InvalidConnector();

        if (address(hook__) != address(0)) {
            (transferInfo, postHookData) = hook__.srcPreHookCall(
                SrcPreHookNFTCallParams(connector_, msg.sender, transferInfo_)
            );
        } else {
            transferInfo = transferInfo_;
        }
    }

    /**
     * @notice Executes post-bridge operations after completing a token bridge transfer.
     * @dev This internal function is called after completing a token bridge transfer.
     * It executes the source post-hook call if a hook contract is defined, calculates fees,
     * calls the outbound function of the connector, and emits an event for tokens withdrawn.
     * @param msgGasLimit_ The gas limit for the outbound call.
     * @param connector_ The address of the connector responsible for the transfer.
     * @param options_ Additional options for the outbound call.
     * @param postHookData_ Data returned from the source post-hook call.
     * @param transferInfo_ Information about the transfer.
     * @dev Reverts with `MessageIdMisMatched` if the returned message ID does not match the expected message ID.
     */
    function _afterBridge(
        uint256 msgGasLimit_,
        address connector_,
        bytes memory options_,
        bytes memory postHookData_,
        NFTTransferInfo memory transferInfo_
    ) internal {
        NFTTransferInfo memory transferInfo = transferInfo_;
        if (address(hook__) != address(0)) {
            transferInfo = hook__.srcPostHookCall(
                SrcPostHookNFTCallParams(
                    connector_,
                    options_,
                    postHookData_,
                    transferInfo_
                )
            );
        }

        uint256 fees = msg.value;
        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: fees
        }(
            msgGasLimit_,
            abi.encode(
                transferInfo.receiver,
                transferInfo.tokenId,
                transferInfo.amount,
                messageId,
                transferInfo.extraData
            ),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();

        emit BridgingTokens(
            connector_,
            msg.sender,
            transferInfo.receiver,
            transferInfo.tokenId,
            transferInfo.amount,
            messageId
        );
    }

    /**
     * @notice Executes pre-mint operations before minting tokens.
     * @dev This internal function is called before minting tokens.
     * It validates the caller as a valid connector, checks if the receiver is not this contract, the bridge contract,
     * or the token contract, and executes the destination pre-hook call if a hook contract is defined.
     * @param transferInfo_ Information about the transfer.
     * @return postHookData Data returned from the destination pre-hook call.
     * @return transferInfo Information about the transfer after pre-mint operations.
     * @dev Reverts with `InvalidConnector` if the caller is not a valid connector.
     * Reverts with `CannotTransferOrExecuteOnBridgeContracts` if the receiver is this contract, the bridge contract,
     * or the token contract.
     */
    function _beforeMint(
        uint32,
        NFTTransferInfo memory transferInfo_
    )
        internal
        returns (bytes memory postHookData, NFTTransferInfo memory transferInfo)
    {
        if (!validConnectors[msg.sender]) revert InvalidConnector();

        // no need of source check here, as if invalid caller, will revert with InvalidPoolId
        if (
            transferInfo_.receiver == address(this) ||
            // transferInfo_.receiver == address(bridge__) ||
            transferInfo_.receiver == token
        ) revert CannotTransferOrExecuteOnBridgeContracts();

        if (address(hook__) != address(0)) {
            (postHookData, transferInfo) = hook__.dstPreHookCall(
                DstPreHookNFTCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    transferInfo_
                )
            );
        } else {
            transferInfo = transferInfo_;
        }
    }

    /**
     * @notice Executes post-mint operations after minting tokens.
     * @dev This internal function is called after minting tokens.
     * It executes the destination post-hook call if a hook contract is defined and updates cache data.
     * @param messageId_ The unique identifier for the mint transaction.
     * @param postHookData_ Data returned from the destination pre-hook call.
     * @param transferInfo_ Information about the mint transaction.
     */
    function _afterMint(
        uint256,
        bytes32 messageId_,
        bytes memory postHookData_,
        NFTTransferInfo memory transferInfo_
    ) internal {
        if (address(hook__) != address(0)) {
            CacheData memory cacheData = hook__.dstPostHookCall(
                DstPostHookNFTCallParams(
                    msg.sender,
                    messageId_,
                    connectorCache[msg.sender],
                    postHookData_,
                    transferInfo_
                )
            );

            identifierCache[messageId_] = cacheData.identifierCache;
            connectorCache[msg.sender] = cacheData.connectorCache;
        }

        if (transferInfo_.extraData.length > 0) {
            INFTMetadata(token).setMetadata(
                transferInfo_.tokenId,
                transferInfo_.extraData
            );
        }

        emit TokensBridged(
            msg.sender,
            transferInfo_.receiver,
            transferInfo_.tokenId,
            transferInfo_.amount,
            messageId_
        );
    }

    /**
     * @notice Executes pre-retry operations before retrying a failed transaction.
     * @dev This internal function is called before retrying a failed transaction.
     * It validates the connector, retrieves cache data for the given message ID,
     * and executes the pre-retry hook if defined.
     * @param connector_ The address of the connector responsible for the failed transaction.
     * @param messageId_ The unique identifier for the failed transaction.
     * @return postHookData Data returned from the pre-retry hook call.
     * @return transferInfo Information about the transfer.
     * @dev Reverts with `InvalidConnector` if the connector is not valid.
     * Reverts with `NoPendingData` if there is no pending data for the given message ID.
     */
    function _beforeRetry(
        address connector_,
        bytes32 messageId_
    )
        internal
        returns (bytes memory postHookData, NFTTransferInfo memory transferInfo)
    {
        if (!validConnectors[connector_]) revert InvalidConnector();

        CacheData memory cacheData = CacheData(
            identifierCache[messageId_],
            connectorCache[connector_]
        );

        if (cacheData.identifierCache.length == 0) revert NoPendingData();
        (postHookData, transferInfo) = hook__.preRetryHook(
            PreRetryHookCallParams(connector_, cacheData)
        );
    }

    /**
     * @notice Executes post-retry operations after retrying a failed transaction.
     * @dev This internal function is called after retrying a failed transaction.
     * It retrieves cache data for the given message ID, executes the post-retry hook if defined,
     * and updates cache data.
     * @param connector_ The address of the connector responsible for the failed transaction.
     * @param messageId_ The unique identifier for the failed transaction.
     * @param postHookData Data returned from the pre-retry hook call.
     */
    function _afterRetry(
        address connector_,
        bytes32 messageId_,
        bytes memory postHookData
    ) internal {
        CacheData memory cacheData = CacheData(
            identifierCache[messageId_],
            connectorCache[connector_]
        );

        (cacheData) = hook__.postRetryHook(
            PostRetryHookCallParams(
                connector_,
                messageId_,
                postHookData,
                cacheData
            )
        );
        identifierCache[messageId_] = cacheData.identifierCache;
        connectorCache[connector_] = cacheData.connectorCache;
    }

    /**
     * @notice Retrieves the minimum fees required for a transaction from a connector.
     * @dev This function returns the minimum fees required for a transaction from the specified connector,
     * based on the provided message gas limit and payload size.
     * @param connector_ The address of the connector.
     * @param msgGasLimit_ The gas limit for the transaction.
     * @param payloadSize_ The size of the payload for the transaction.
     * @return totalFees The total minimum fees required for the transaction.
     */
    function getMinFees(
        address connector_,
        uint256 msgGasLimit_,
        uint256 payloadSize_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_, payloadSize_);
    }
}
