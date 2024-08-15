// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

/**
 * @title DummyERC20
 * @notice An Dummy ERC20 contract which is used for testing Superbridge. Do not use in production
 * @dev This contract suports minting and burning of tokens
 */
contract DummyERC20 is ERC20 {
    /**
     * @notice constructor for creating a new Token
     * @param name_ token name
     * @param symbol_ token symbol
     * @param decimals_ token decimals
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    function burn(address user_, uint256 amount_) external {
        _burn(user_, amount_);
    }

    function mint(address receiver_, uint256 amount_) external {
        _mint(receiver_, amount_);
    }
}
