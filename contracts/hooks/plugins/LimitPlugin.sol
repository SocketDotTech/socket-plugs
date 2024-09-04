// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../HookBase.sol";
import {Gauge} from "../../utils/Gauge.sol";

abstract contract LimitPlugin is Gauge, HookBase {
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // connector => receivingLimitParams
    mapping(address => LimitParams) _receivingLimitParams;

    // connector => sendingLimitParams
    mapping(address => LimitParams) _sendingLimitParams;

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // Emitted when limit parameters are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);

    // Emitted when pending tokens are minted to the receiver
    event PendingTokensBridged(
        address connector,
        address receiver,
        uint256 consumedAmount,
        uint256 pendingAmount,
        bytes32 messageId
    );
    // Emitted when the transfer reaches the limit, and the token mint is added to the pending queue
    event TokensPending(
        address connector,
        address receiver,
        uint256 consumedAmount,
        uint256 pendingAmount,
        bytes32 messageId
    );

    /**
     * @notice This function is used to set bridge limits.
     * @dev It can only be updated by the owner.
     * @param updates An array of structs containing update parameters.
     */
    function updateLimitParams(
        UpdateLimitParams[] calldata updates
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i = 0; i < updates.length; i++) {
            if (updates[i].isMint) {
                _consumePartLimit(
                    0,
                    _receivingLimitParams[updates[i].connector]
                ); // To keep the current limit in sync
                _receivingLimitParams[updates[i].connector].maxLimit = updates[
                    i
                ].maxLimit;
                _receivingLimitParams[updates[i].connector]
                    .ratePerSecond = updates[i].ratePerSecond;
            } else {
                _consumePartLimit(0, _sendingLimitParams[updates[i].connector]); // To keep the current limit in sync
                _sendingLimitParams[updates[i].connector].maxLimit = updates[i]
                    .maxLimit;
                _sendingLimitParams[updates[i].connector]
                    .ratePerSecond = updates[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates);
    }

    function getCurrentReceivingLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[connector_]);
    }

    function getCurrentSendingLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[connector_]);
    }

    function getReceivingLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[connector_];
    }

    function getSendingLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[connector_];
    }

    function _limitSrcHook(address connector_, uint256 amount_) internal {
        if (_sendingLimitParams[connector_].maxLimit == 0)
            revert SiblingNotSupported();

        _consumeFullLimit(amount_, _sendingLimitParams[connector_]); // Reverts on limit hit
    }

    function _limitDstHook(
        address connector_,
        uint256 amount_
    ) internal returns (uint256 consumedAmount, uint256 pendingAmount) {
        if (_receivingLimitParams[connector_].maxLimit == 0)
            revert SiblingNotSupported();

        (consumedAmount, pendingAmount) = _consumePartLimit(
            amount_,
            _receivingLimitParams[connector_]
        );
    }

    function _getConnectorPendingAmount(
        bytes memory connectorCache_
    ) internal pure returns (uint256) {
        if (connectorCache_.length > 0) {
            return abi.decode(connectorCache_, (uint256));
        } else return 0;
    }
}
