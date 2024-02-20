pragma solidity 0.8.13;

import {IExchangeRate} from "../ExchangeRate.sol";
import {Gauge} from "../../common/Gauge.sol";
import {IConnector, IHub} from "../ConnectorPlug.sol";
import {IMintableERC20} from "../IMintableERC20.sol";
import {RescueFundsLib} from "../../libraries/RescueFundsLib.sol";
import {SuperBridgePayloadBase} from "./SuperBridgePayloadBase.sol";

contract Controller is IHub, Gauge, SuperBridgePayloadBase {
    IMintableERC20 public immutable token__;
    IExchangeRate public exchangeRate__;

    struct UpdateLimitParams {
        bool isMint;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    // connector => mintLimitParams
    mapping(address => LimitParams) _mintLimitParams;

    // connector => burnLimitParams
    mapping(address => LimitParams) _burnLimitParams;

    // connector => receiver => messageId => amount
    mapping(address => mapping(address => mapping(bytes32 => uint256)))
        public pendingMints;

    // connector => amount
    mapping(address => uint256) public connectorPendingMints;

    uint256 public totalMinted;

    error ConnectorUnavailable();
    error InvalidPoolId();
    error ZeroAmount();
    event ExchangeRateUpdated(address exchangeRate);
    event ConnectorPoolIdUpdated(address connector, uint256 poolId);
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event TokensWithdrawn(
        address connector,
        address withdrawer,
        address receiver,
        uint256 burnAmount,
        bytes32 messageId
    );
    event PendingTokensMinted(
        address connector,
        address receiver,
        uint256 mintAmount,
        uint256 pendingAmount,
        bytes32 messageId
    );
    event TokensPending(
        address connecter,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 messageId
    );
    event TokensMinted(
        address connecter,
        address receiver,
        uint256 mintAmount,
        bytes32 messageId
    );

    constructor(address token_, address exchangeRate_) {
        token__ = IMintableERC20(token_);
        exchangeRate__ = IExchangeRate(exchangeRate_);
    }

    function updateExchangeRate(address exchangeRate_) external onlyOwner {
        exchangeRate__ = IExchangeRate(exchangeRate_);
        emit ExchangeRateUpdated(exchangeRate_);
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

    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyOwner {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isMint) {
                _consumePartLimit(0, _mintLimitParams[updates_[i].connector]); // to keep current limit in sync
                _mintLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _mintLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(0, _burnLimitParams[updates_[i].connector]); // to keep current limit in sync
                _burnLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _burnLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function withdrawFromAppChain(
        address receiver_,
        uint256 burnAmount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_
    ) external payable {
        if (burnAmount_ == 0) revert ZeroAmount();

        if (_burnLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        _consumeFullLimit(burnAmount_, _burnLimitParams[connector_]); // reverts on limit hit

        totalMinted -= burnAmount_;
        _burn(msg.sender, burnAmount_);

        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();
        uint256 unlockAmount = exchangeRate__.getUnlockAmount(
            burnAmount_,
            poolLockedAmounts[connectorPoolId]
        );
        poolLockedAmounts[connectorPoolId] -= unlockAmount; // underflow revert expected

        bytes32 messageId = IConnector(connector_).getMessageId();
        bytes32 returnedMessageId = IConnector(connector_).outbound{
            value: msg.value
        }(
            msgGasLimit_,
            abi.encode(receiver_, unlockAmount, messageId, execPayload_)
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();

        emit TokensWithdrawn(
            connector_,
            msg.sender,
            receiver_,
            burnAmount_,
            messageId
        );
    }

    function _burn(address user_, uint256 burnAmount_) internal virtual {
        token__.burn(user_, burnAmount_);
    }

    function mintPendingFor(
        address receiver_,
        address connector_,
        bytes32 messageId_
    ) external {
        if (_mintLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        uint256 pendingMint = pendingMints[connector_][receiver_][messageId_];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingMint,
            _mintLimitParams[connector_]
        );

        pendingMints[connector_][receiver_][messageId_] = pendingAmount;
        connectorPendingMints[connector_] -= consumedAmount;
        totalMinted += consumedAmount;

        token__.mint(receiver_, consumedAmount);

        address receiver = pendingExecutions[messageId_].receiver;
        if (pendingAmount == 0 && receiver != address(0)) {
            if (receiver_ != receiver) revert InvalidReceiver();

            address connector = pendingExecutions[messageId_].connector;
            if (connector != connector_) revert InvalidConnector();

            // execute
            pendingExecutions[messageId_].isAmountPending = false;
            bool success = executionHelper__.execute(
                receiver_,
                pendingExecutions[messageId_].payload
            );
            if (success) _clearPayload(messageId_);
        }

        emit PendingTokensMinted(
            connector_,
            receiver_,
            consumedAmount,
            pendingAmount,
            messageId_
        );
    }

    // receive inbound assuming connector called
    function receiveInbound(bytes memory payload_) external override {
        if (_mintLimitParams[msg.sender].maxLimit == 0)
            revert ConnectorUnavailable();

        (
            address receiver,
            uint256 lockAmount,
            bytes32 messageId,
            bytes memory execPayload
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        uint256 connectorPoolId = connectorPoolIds[msg.sender];
        if (connectorPoolId == 0) revert InvalidPoolId();
        poolLockedAmounts[connectorPoolId] += lockAmount;

        uint256 mintAmount = exchangeRate__.getMintAmount(
            lockAmount,
            poolLockedAmounts[connectorPoolId]
        );
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            mintAmount,
            _mintLimitParams[msg.sender]
        );

        totalMinted += consumedAmount;
        token__.mint(receiver, consumedAmount);

        if (pendingAmount > 0) {
            pendingMints[msg.sender][receiver][messageId] = pendingAmount;
            connectorPendingMints[msg.sender] += pendingAmount;

            if (execPayload.length > 0)
                _cachePayload(
                    messageId,
                    true,
                    msg.sender,
                    receiver,
                    execPayload
                );

            emit TokensPending(
                msg.sender,
                receiver,
                pendingAmount,
                pendingMints[msg.sender][receiver][messageId],
                messageId
            );
        } else if (execPayload.length > 0) {
            // execute
            bool success = executionHelper__.execute(receiver, execPayload);

            if (!success)
                _cachePayload(
                    messageId,
                    false,
                    msg.sender,
                    receiver,
                    execPayload
                );
        }

        emit TokensMinted(msg.sender, receiver, consumedAmount, messageId);
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }

    function getCurrentMintLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_mintLimitParams[connector_]);
    }

    function getCurrentBurnLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_burnLimitParams[connector_]);
    }

    function getMintLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _mintLimitParams[connector_];
    }

    function getBurnLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _burnLimitParams[connector_];
    }

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
