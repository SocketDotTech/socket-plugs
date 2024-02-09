pragma solidity 0.8.13;

import {Gauge} from "../common/Gauge.sol";
import "../common/AccessControl.sol";

/**
 * @title LimitController
 * @notice Maintains lock and unlock limits for each sibling
 */
abstract contract LimitController is Gauge, AccessControl {
    struct UpdateLimitParams {
        bool isOutbound;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // connector => receiver => pendingInbound
    mapping(address => mapping(address => uint256)) public pendingInbound;

    // connector => amount
    mapping(address => uint256) public connectorPendingInbound;

    // siblingChainSlug => outboundLimitParams
    mapping(address => LimitParams) _outboundLimitParams;

    // siblingChainSlug => inboundLimitParams
    mapping(address => LimitParams) _inboundLimitParams;

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when limit params are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event PendingTokensTransferred(
        address connector,
        address receiver,
        uint256 unlockedAmount,
        uint256 pendingAmount
    );
    event TokensPending(
        address connector,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount
    );
    event TokensUnlocked(
        address connector,
        address receiver,
        uint256 unlockedAmount
    );

    error ConnectorUnavailable();

    /**
     * @notice this function is used to set bridge limits
     * @dev it can only be updated by owner
     * @param updates_ can be used to set mint and burn limits for all siblings in one call.
     */
    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isOutbound) {
                _consumePartLimit(
                    0,
                    _outboundLimitParams[updates_[i].connector]
                ); // to keep current limit in sync
                _outboundLimitParams[updates_[i].connector].maxLimit = updates_[
                    i
                ].maxLimit;
                _outboundLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _inboundLimitParams[updates_[i].connector]
                ); // to keep current limit in sync
                _inboundLimitParams[updates_[i].connector].maxLimit = updates_[
                    i
                ].maxLimit;
                _inboundLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function _unlockPendingFor(address receiver_, address connector_) internal {
        if (_inboundLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        uint256 pendingInboundAmount = pendingInbound[connector_][receiver_];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingInboundAmount,
            _inboundLimitParams[connector_]
        );

        pendingInbound[connector_][receiver_] = pendingAmount;
        connectorPendingInbound[connector_] -= consumedAmount;

        emit PendingTokensTransferred(
            connector_,
            receiver_,
            consumedAmount,
            pendingAmount
        );
    }

    function _depositLimitHook(uint256 amount_, address connector_) internal {
        if (_outboundLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        // reverts on limit hit
        _consumeFullLimit(amount_, _outboundLimitParams[connector_]);
    }

    function _withdrawLimitHook(
        address receiver_,
        uint256 unlockAmount_
    ) internal returns (uint256) {
        if (_inboundLimitParams[msg.sender].maxLimit == 0)
            revert ConnectorUnavailable();

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            unlockAmount_,
            _inboundLimitParams[msg.sender]
        );

        if (pendingAmount > 0) {
            // add instead of overwrite to handle case where already pending amount is left
            pendingInbound[msg.sender][receiver_] += pendingAmount;
            connectorPendingInbound[msg.sender] += pendingAmount;
            emit TokensPending(
                msg.sender,
                receiver_,
                pendingAmount,
                pendingInbound[msg.sender][receiver_]
            );
        }
        emit TokensUnlocked(msg.sender, receiver_, consumedAmount);

        return consumedAmount;
    }

    function getCurrentOutboundLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_outboundLimitParams[connector_]);
    }

    function getCurrentInboundLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_inboundLimitParams[connector_]);
    }

    function getOutboundLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _outboundLimitParams[connector_];
    }

    function getInboundLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _inboundLimitParams[connector_];
    }
}
