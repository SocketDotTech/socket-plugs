// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

abstract contract IMintableERC20 is ERC20 {
    function mint(address receiver_, uint256 amount_) external virtual;

    function burn(address burner_, uint256 amount_) external virtual;
}
