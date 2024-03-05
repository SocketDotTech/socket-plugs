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

    // limits on assets or shares?
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_
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
                extraData
            );
        }

        totalMinted -= finalAmount;
        _burn(msg.sender, finalAmount);

        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();
        // send it to hook
        poolLockedAmounts[connectorPoolId] -= finalAmount; // underflow revert expected

        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            connector_,
            abi.encode(finalReceiver, finalAmount, messageId, extraData)
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();

        emit TokensWithdrawn(
            connector_,
            msg.sender,
            finalReceiver,
            finalAmount,
            messageId
        );
    }

    function _burn(address user_, uint256 burnAmount_) internal virtual {
        token__.burn(user_, burnAmount_);
    }

    // receive inbound assuming connector called
    function receiveInbound(
        bytes memory payload_
    ) external override nonReentrant {
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

        uint256 connectorPoolId = connectorPoolIds[msg.sender];
        if (connectorPoolId == 0) revert InvalidPoolId();

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

        poolLockedAmounts[connectorPoolId] += finalAmount;

        totalMinted += finalAmount;
        token__.mint(receiver, finalAmount);

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

        emit TokensMinted(msg.sender, finalReceiver, finalAmount, messageId);
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

        totalMinted += consumedAmount;
        token__.mint(receiver, consumedAmount);

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

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }
}
