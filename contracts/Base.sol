pragma solidity 0.8.13;

import {IMintableERC20} from "./interfaces/IMintableERC20.sol";
import {IConnector} from "./interfaces/IConnector.sol";
import "solmate/utils/SafeTransferLib.sol";
import "./interfaces/IHook.sol";
import "./common/Errors.sol";
import "solmate/utils/ReentrancyGuard.sol";
import "./interfaces/IHub.sol";
import "./utils/RescueBase.sol";

abstract contract Base is ReentrancyGuard, IHub, RescueBase {
    address public immutable token;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // connector => cache
    mapping(address => bytes) public connectorCache;

    mapping(address => bool) public validConnectors;

    event ConnectorPoolIdUpdated(address connector, uint256 poolId);
    event ConnectorStatusUpdated(address connector, bool status);

    // emitted when message hook is updated
    event HookUpdated(address newHook);
    event TokensWithdrawn(
        address connector,
        address withdrawer,
        address receiver,
        uint256 burnAmount,
        bytes32 messageId
    );
    event TokensMinted(
        address connecter,
        address receiver,
        uint256 mintAmount,
        bytes32 messageId
    );

    constructor(address token_) AccessControl(msg.sender) {
        if (token_.code.length == 0) revert InvalidTokenContract();
        token = token_;
    }

    /**
     * @notice this function is used to update hook
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param hook_ new hook address
     */
    function updateHook(address hook_, bool) external virtual onlyOwner {
        hook__ = IHook(hook_);
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

    function _beforeBridge(
        address connector_,
        TransferInfo memory transferInfo_
    )
        internal
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        if (transferInfo_.receiver == address(0)) revert ZeroAddressReceiver();
        if (transferInfo_.amount == 0) revert ZeroAmount();
        if (!validConnectors[connector_]) revert InvalidConnector();

        if (address(hook__) != address(0)) {
            (transferInfo, postHookData) = hook__.srcPreHookCall(
                SrcPreHookCallParams(connector_, msg.sender, transferInfo_)
            );
        }
    }

    function _afterBridge(
        uint256 msgGasLimit_,
        address connector_,
        bytes memory options_,
        bytes memory postSrcHookData_,
        TransferInfo memory transferInfo_
    ) internal {
        TransferInfo memory transferInfo = transferInfo_;
        if (address(hook__) != address(0)) {
            transferInfo = hook__.srcPostHookCall(
                SrcPostHookCallParams(
                    connector_,
                    options_,
                    postSrcHookData_,
                    transferInfo_
                )
            );
        }

        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            abi.encode(
                transferInfo.receiver,
                transferInfo.amount,
                messageId,
                transferInfo.data
            ),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();

        emit TokensWithdrawn(
            connector_,
            msg.sender,
            transferInfo.receiver,
            transferInfo.amount,
            messageId
        );
    }

    // receive inbound assuming connector called
    function _beforeMint(
        uint32,
        TransferInfo memory transferInfo_
    )
        internal
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        if (!validConnectors[msg.sender]) revert NotMessageBridge();

        // no need of source check here, as if invalid caller, will revert with InvalidPoolId
        if (
            transferInfo_.receiver == address(this) ||
            // transferInfo_.receiver == address(bridge__) ||
            transferInfo_.receiver == token
        ) revert CannotTransferOrExecuteOnBridgeContracts();

        if (address(hook__) != address(0)) {
            (postHookData, transferInfo) = hook__.dstPreHookCall(
                DstPreHookCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    transferInfo_
                )
            );
        }
    }

    function _afterMint(
        uint256,
        bytes32 messageId,
        bytes memory postHookData,
        TransferInfo memory transferInfo_
    ) internal {
        if (address(hook__) != address(0)) {
            CacheData memory cacheData = hook__.dstPostHookCall(
                DstPostHookCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    postHookData_,
                    transferInfo_
                )
            );

            identifierCache[messageId_] = cacheData.identifierCache;
            connectorCache[msg.sender] = cacheData.connectorCache;
        }
    }

    function _beforeRetry(
        address connector_,
        bytes32 messageId_
    )
        internal
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        if (!validConnectors[connector_]) revert NotMessageBridge();

        CacheData memory cacheData = CacheData(
            identifierCache[messageId_],
            connectorCache[connector_]
        );

        if (cacheData.identifierCache.length == 0) revert NoPendingData();
        (postRetryHookData, transferInfo) = hook__.preRetryHook(
            PreRetryHookCallParams(connector_, cacheData)
        );
    }

    function _afterRetry(
        address connector_,
        bytes32 messageId_,
        bytes memory postRetryHookData
    ) internal {
        CacheData memory cacheData = CacheData(
            identifierCache[messageId_],
            connectorCache[connector_]
        );

        (cacheData) = hook__.postRetryHook(
            PostRetryHookCallParams(connector_, postRetryHookData, cacheData)
        );
        identifierCache[messageId_] = cacheData.identifierCache;
        connectorCache[connector_] = cacheData.connectorCache;

        // emit PendingTokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     consumedAmount,
        //     identifier
        // );
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_,
        uint256 payloadSize_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_, payloadSize_);
    }
}
