// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IWrapERC20 {
    function mint(address receiver_, uint256 amount_) external;

    function burn(address burner_, uint256 amount_) external;

    function deposit(address to_) external payable;

    function withdraw(uint256 amount_, address to_) external;

    function balanceOf(address user_) external view returns (uint256);
}
