pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./HookBase.sol";
import {Gauge} from "../common/Gauge.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract enabling bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
abstract contract LimitHookBase is HookBase, Gauge {
    struct UpdateLimitParams {
        bool isMint;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // connector => receivingLimitParams
    mapping(address => LimitParams) _receivingLimitParams;

    // connector => sendingLimitParams
    mapping(address => LimitParams) _sendingLimitParams;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error SiblingNotSupported();

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // Emitted when limit parameters are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);

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
}
