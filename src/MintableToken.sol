pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

abstract contract IMintableERC20 is ERC20 {
    function mint(address receiver_, uint256 amount_) external virtual;

    function burn(address burner_, uint256 amount_) external virtual;
}

contract MintableToken is IMintableERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    function mint(address receiver_, uint256 amount_) external override {
        _mint(receiver_, amount_);
    }

    function burn(address burner_, uint256 amount_) external override {
        _burn(burner_, amount_);
    }
}
