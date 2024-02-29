pragma solidity 0.8.13;

import "./ERC20.sol";

abstract contract Token is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    // overridden in controller
    function balanceOf(address user_) external view virtual returns (uint256);

    function totalSupply() external view virtual returns (uint256);
}
