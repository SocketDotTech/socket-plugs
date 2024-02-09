pragma solidity 0.8.13;

import {Gauge} from "../common/Gauge.sol";
import "../common/AccessControl.sol";

/**
 * @title LimitController
 * @notice Maintains burn/lock and mint/unlock limits for each sibling
 */
abstract contract LimitController is Gauge, AccessControl {
    struct UpdateLimitParams {
        bool isMintOrUnlock;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // connector => receiver => pendingMintAndUnlocks
    mapping(address => mapping(address => uint256))
        public pendingMintAndUnlocks;

    // connector => amount
    mapping(address => uint256) public connectorPendingMintAndUnlocks;

    // siblingChainSlug => mintAndUnlockLimitParams
    mapping(address => LimitParams) _mintAndUnlockLimitParams;

    // siblingChainSlug => burnAndLockLimitParams
    mapping(address => LimitParams) _burnAndLockLimitParams;

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
            if (updates_[i].isMintOrUnlock) {
                _consumePartLimit(
                    0,
                    _mintAndUnlockLimitParams[updates_[i].connector]
                ); // to keep current limit in sync
                _mintAndUnlockLimitParams[updates_[i].connector]
                    .maxLimit = updates_[i].maxLimit;
                _mintAndUnlockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _burnAndLockLimitParams[updates_[i].connector]
                ); // to keep current limit in sync
                _burnAndLockLimitParams[updates_[i].connector]
                    .maxLimit = updates_[i].maxLimit;
                _burnAndLockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function _mintOrUnlockPendingFor(
        address receiver_,
        address connector_
    ) internal {
        if (_burnAndLockLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        uint256 pendingMintAndUnlocksAmount = pendingMintAndUnlocks[connector_][
            receiver_
        ];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingMintAndUnlocksAmount,
            _burnAndLockLimitParams[connector_]
        );

        pendingMintAndUnlocks[connector_][receiver_] = pendingAmount;
        connectorPendingMintAndUnlocks[connector_] -= consumedAmount;

        emit PendingTokensTransferred(
            connector_,
            receiver_,
            consumedAmount,
            pendingAmount
        );
    }

    // used for burn and lock actions
    function _checkLimitAndRevert(
        uint256 amount_,
        address connector_
    ) internal {
        if (_mintAndUnlockLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        // reverts on limit hit
        _consumeFullLimit(amount_, _mintAndUnlockLimitParams[connector_]);
    }

    // used for mint and unlock actions
    function _checkLimitAndQueue(
        address receiver_,
        uint256 unlockAmount_
    ) internal returns (uint256) {
        if (_burnAndLockLimitParams[msg.sender].maxLimit == 0)
            revert ConnectorUnavailable();

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            unlockAmount_,
            _burnAndLockLimitParams[msg.sender]
        );

        if (pendingAmount > 0) {
            // add instead of overwrite to handle case where already pending amount is left
            pendingMintAndUnlocks[msg.sender][receiver_] += pendingAmount;
            connectorPendingMintAndUnlocks[msg.sender] += pendingAmount;
            emit TokensPending(
                msg.sender,
                receiver_,
                pendingAmount,
                pendingMintAndUnlocks[msg.sender][receiver_]
            );
        }
        return consumedAmount;
    }

    function getCurrentMintAndUnlockLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_mintAndUnlockLimitParams[connector_]);
    }

    function getCurrentBurnAndLockLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_burnAndLockLimitParams[connector_]);
    }

    function getMintAndUnlockLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _mintAndUnlockLimitParams[connector_];
    }

    function getBurnAndLockLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _burnAndLockLimitParams[connector_];
    }
}
