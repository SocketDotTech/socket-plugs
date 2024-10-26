// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IWrapERC20 {
    function mint(address receiver_, uint256 amount_) external;

    function burn(address burner_, uint256 amount_) external;

    function withdraw(uint256 amount_) external;
}
