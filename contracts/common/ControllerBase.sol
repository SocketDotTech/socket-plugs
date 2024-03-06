pragma solidity 0.8.13;

import {IMintableERC20} from "../interfaces/IMintableERC20.sol";
import {IConnector} from "../interfaces/IConnector.sol";
import "solmate/utils/SafeTransferLib.sol";
import "./Base.sol";
import "../interfaces/IHook.sol";
import {NotAuthorized, ZeroAmount, ZeroAddressReceiver} from "./errors.sol";

contract ControllerBase is Base {
    IMintableERC20 public immutable token__;
    IHook public hook__;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // connector => cache
    mapping(address => bytes) public connectorCache;

    // how to track this in case of super token
    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    mapping(address => bool) public validConnectors;

    uint256 public totalMinted;

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

    function updateConnectorPoolId(
        address[] calldata connectors,
        uint256[] calldata poolIds
    ) external onlyOwner {
        uint256 length = connectors.length;
        for (uint256 i; i < length; i++) {
            if (poolIds[i] == 0) revert InvalidPoolId();
            connectorPoolIds[connectors[i]] = poolIds[i];
            emit ConnectorPoolIdUpdated(connectors[i], poolIds[i]);
        }
    }

    function _beforeBridge(
        address receiver_,
        uint256 amount_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata
    ) internal returns (address, uint256, bytes) {
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
                extraData
            );
        }
        totalMinted -= finalAmount;

        return (finalReceiver, finalAmount, extraData);
    }

    function _afterBridge(
        address finalReceiver_,
        uint256 finalAmount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata payload_,
        bytes calldata options_
    ) internal {
        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            connector_,
            abi.encode(finalReceiver_, finalAmount_, messageId, payload_),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();

        emit TokensWithdrawn(
            connector_,
            msg.sender,
            finalReceiver_,
            finalAmount_,
            messageId
        );
    }

    // receive inbound assuming connector called
    function _beforeMint(bytes memory payload_) internal {
        // no need of source check here, as if invalid caller, will revert with InvalidPoolId

        (
            address receiver,
            uint256 lockAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        if (
            receiver == address(this) ||
            // receiver == address(bridge__) ||
            receiver == address(token__)
        ) revert CannotTransferOrExecuteOnBridgeContracts();

        address finalReceiver = receiver;
        uint256 finalAmount = lockAmount;
        bytes memory postHookData = new bytes(0);

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, postHookData) = hook__.dstPreHookCall(
                receiver,
                lockAmount,
                IConnector(msg.sender).siblingChainSlug(),
                msg.sender,
                extraData,
                connectorCache[msg.sender]
            );
        }

        totalMinted += finalAmount;

        return (finalReceiver, finalAmount, lockAmount, postHookData);
    }

    function _afterMint(
        address finalReceiver,
        uint256 lockAmount,
        uint256 msgGasLimit_,
        bytes memory extraData,
        bytes memory postHookData,
        uint256 messageId
    ) internal {
        if (address(hook__) != address(0)) {
            (
                bytes memory newIdentifierCache,
                bytes memory newSiblingCache
            ) = hook__.dstPostHookCall(
                    finalReceiver,
                    lockAmount,
                    IConnector(msg.sender).siblingChainSlug(),
                    msg.sender,
                    extraData,
                    postHookData,
                    connectorCache[msg.sender]
                );

            identifierCache[messageId] = newIdentifierCache;
            connectorCache[msg.sender] = newSiblingCache;
        }
    }

    function _beforeRetry(address connector_, bytes32 identifier_) internal {
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
        totalMinted += consumedAmount;
    }

    function _afterRetry(
        address connector_,
        bytes32 identifier_,
        bytes memory postRetryHookData,
        CacheData memory cacheData_
    ) internal {
        (identifierCache[identifier_], connectorCache[connector_]) = hook__
            .postRetryHook(
                IConnector(connector_).siblingChainSlug(),
                connector_,
                cacheData_,
                postRetryHookData
            );

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
