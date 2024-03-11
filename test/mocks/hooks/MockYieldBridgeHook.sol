// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "../../../contracts/hooks/Vault_YieldLimitExecHook.sol";

contract MockYieldBridgeHook is Vault_YieldLimitExecHook {
    constructor(
        uint256 debtRatio_,
        uint128 rebalanceDelay_,
        address strategy_,
        address underlyingAsset_,
        address controller_,
        address executionHelper_
    )
        Vault_YieldLimitExecHook(
            debtRatio_,
            rebalanceDelay_,
            strategy_,
            underlyingAsset_,
            controller_,
            executionHelper_,
            false
        )
    {}

    function updateStorage(
        uint256 totalIdle_,
        uint256 totalDebt_,
        uint256 totalLockedInStrategy_
    ) external {
        totalIdle_ = totalIdle;
        totalDebt_ = totalDebt;
        totalLockedInStrategy_ = totalLockedInStrategy;
        lastRebalanceTimestamp = uint128(block.timestamp);
    }
}
