pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./HookBase.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract enabling bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
abstract contract LimitHookBase is HookBase {
    struct UpdateLimitParams {
        bool isMint;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // siblingChainSlug => receivingLimitParams
    mapping(uint32 => LimitParams) _receivingLimitParams;

    // siblingChainSlug => sendingLimitParams
    mapping(uint32 => LimitParams) _sendingLimitParams;

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
                    _receivingLimitParams[updates[i].siblingChainSlug]
                ); // To keep the current limit in sync
                _receivingLimitParams[updates[i].siblingChainSlug]
                    .maxLimit = updates[i].maxLimit;
                _receivingLimitParams[updates[i].siblingChainSlug]
                    .ratePerSecond = updates[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _sendingLimitParams[updates[i].siblingChainSlug]
                ); // To keep the current limit in sync
                _sendingLimitParams[updates[i].siblingChainSlug]
                    .maxLimit = updates[i].maxLimit;
                _sendingLimitParams[updates[i].siblingChainSlug]
                    .ratePerSecond = updates[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates);
    }

    function getCurrentReceivingLimit(
        uint32 siblingChainSlug
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[siblingChainSlug]);
    }

    function getCurrentSendingLimit(
        uint32 siblingChainSlug
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[siblingChainSlug]);
    }

    function getReceivingLimitParams(
        uint32 siblingChainSlug
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[siblingChainSlug];
    }

    function getSendingLimitParams(
        uint32 siblingChainSlug
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[siblingChainSlug];
    }
}
