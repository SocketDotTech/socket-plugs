// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "../../contracts/yield-bridge/interfaces/IStrategy.sol";
import "../../contracts/superbridge/IMintableERC20.sol";

/**
 * @title MockStrategy
 */
contract MockStrategy is IStrategy {
    IMintableERC20 public token;

    event Invested(uint256 amount);
    error InsufficientFunds();

    constructor(address token_) {
        token = IMintableERC20(token_);
    }

    function withdraw(uint256 amount_) external returns (uint256) {
        uint256 total = token.balanceOf(address(this));
        if (total < amount_) revert InsufficientFunds();
        token.transfer(msg.sender, amount_);
    }

    function withdrawAll() external {
        uint256 amount = token.balanceOf(address(this));
        token.transfer(msg.sender, amount);
    }

    function estimatedTotalAssets()
        external
        view
        returns (uint256 totalAssets_)
    {
        return token.balanceOf(address(this));
    }

    // stores balance in this contract
    function invest() external {
        emit Invested(token.balanceOf(address(this)));
    }
}
