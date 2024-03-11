// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "../../../contracts/hooks/Controller_YieldLimitExecHook.sol";

contract MockYieldTokenHook is Controller_YieldLimitExecHook {
    constructor(
        address underlyingAsset_,
        address controller_,
        address executionHelper_
    )
        Controller_YieldLimitExecHook(
            underlyingAsset_,
            controller_,
            executionHelper_
        )
    {}

    function updateSiblingYield(uint256 poolId_, uint256 yield_) external {
        poolLockedAmounts[poolId_] = yield_;
    }

    function updateTotalYield(uint256 yield_) external {
        totalUnderlyingAssets = yield_;
        yieldToken__.updateTotalUnderlyingAssets(yield_);
    }
}
