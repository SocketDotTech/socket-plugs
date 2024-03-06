pragma solidity 0.8.13;

import {IMintableERC20} from "../interfaces/IMintableERC20.sol";
import {IConnector} from "../interfaces/IConnector.sol";
import "solmate/utils/SafeTransferLib.sol";
import "./Base.sol";
import "../interfaces/IHook.sol";
import {NotAuthorized, ZeroAmount, ZeroAddressReceiver} from "../common/Errors.sol";
import "../common/Structs.sol";

contract ControllerBase is Base {
    IMintableERC20 public immutable token__;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // connector => cache
    mapping(address => bytes) public connectorCache;

    mapping(address => bool) public validConnectors;

    error ConnectorUnavailable();
    error InvalidPoolId();
    error CannotTransferOrExecuteOnBridgeContracts();
    error NoPendingData();
    error MessageIdMisMatched();
    event ExchangeRateUpdated(address exchangeRate);
    event ConnectorPoolIdUpdated(address connector, uint256 poolId);
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

    constructor(address token_, address hook_) AccessControl(msg.sender) {
        token__ = IMintableERC20(token_);
        hook__ = IHook(hook_);
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
    ) internal returns (TransferInfo memory transferInfo) {
        if (transferInfo_.receiver == address(0)) revert ZeroAddressReceiver();
        if (transferInfo_.amount == 0) revert ZeroAmount();
        if (!validConnectors[connector_]) revert InvalidConnector();

        if (address(hook__) != address(0)) {
            transferInfo = hook__.srcHookCall(
                connector_,
                msg.sender,
                transferInfo_
            );
        }
    }

    function _afterBridge(
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata options_,
        TransferInfo memory transferInfo
    ) internal {
        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            connector_,
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
            transferInfo_.receiver == address(token__)
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

        totalMinted += transferInfo.amount;
    }

    function _afterMint(
        uint256 lockAmount,
        uint256 messageId,
        bytes memory postHookData,
        TransferInfo memory transferInfo_
    ) internal {
        if (address(hook__) != address(0)) {
            CacheData memory cacheData = hook__.dstPostHookCall(
                DstPostHookCallParams(
                    msg.sender,
                    connectorCache[msg.sender],
                    postHookData,
                    transferInfo_
                )
            );

            identifierCache[messageId] = cacheData.identifierCache;
            connectorCache[msg.sender] = cacheData.connectorCache;
        }
    }

    function _beforeRetry(
        address connector_,
        bytes32 identifier_
    )
        internal
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        if (!validConnectors[connector_]) revert NotMessageBridge();

        CacheData memory cacheData = CacheData(
            identifierCache[identifier_],
            connectorCache[connector_]
        );

        if (cacheData.identifierCache.length == 0) revert NoPendingData();
        (postRetryHookData, transferInfo) = hook__.preRetryHook(
            PreRetryHookCallParams(connector_, cacheData)
        );

        totalMinted += transferInfo.amount;
    }

    function _afterRetry(
        address connector_,
        bytes32 identifier_,
        bytes memory postRetryHookData,
        CacheData memory cacheData_
    ) internal {
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

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }
}
