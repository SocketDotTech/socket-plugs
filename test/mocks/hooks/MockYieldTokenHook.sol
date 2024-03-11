// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "../../../contracts/hooks/YieldTokenLimitExecutionHook.sol";

contract MockYieldTokenHook is YieldTokenLimitExecutionHook {
    constructor(
        address asset_,
        address controller_
    ) YieldTokenLimitExecutionHook(asset_, controller_) {}

    function updateSiblingYield(address connector_, uint256 yield_) external {
        // poolLockedAmounts[connector_] = yield_;
        lastSyncTimestamp[connector_] = block.timestamp;
    }

    function updateTotalYield(uint256 yield_) external {
        totalYield = yield_;
        asset__.updateYield(yield_);
    }
}
