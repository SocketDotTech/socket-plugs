// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "../../../contracts/hooks/YieldTokenLimitExecutionHook.sol";

contract MockYieldTokenHook is YieldTokenLimitExecutionHook {
    constructor(
        address asset_,
        address controller_,
        address executionHelper_
    ) YieldTokenLimitExecutionHook(asset_, controller_, executionHelper_) {}

    function updateSiblingYield(uint256 poolId_, uint256 yield_) external {
        poolLockedAmounts[poolId_] = yield_;
        lastSyncTimestamp[poolId_] = block.timestamp;
    }

    function updateTotalYield(uint256 yield_) external {
        totalYield = yield_;
        asset__.updateYield(yield_);
    }
}