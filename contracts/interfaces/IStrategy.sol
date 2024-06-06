// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * @title IStrategy
 * @notice Interface for strategy contract which interacts with other protocols
 */
interface IStrategy {
    function withdraw(uint256 amount_) external returns (uint256 loss_);

    function withdrawAll() external;

    function estimatedTotalAssets()
        external
        view
        returns (uint256 totalUnderlyingAssets_);

    function invest() external;
}
