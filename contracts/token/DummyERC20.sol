// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract DummyERC20 is ERC20 {
    // for all controller access (mint, burn)

    /**
     * @notice constructor for creating a new SuperToken.
     * @param name_ token name
     * @param symbol_ token symbol
     * @param decimals_ token decimals (should be same on all chains)
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
