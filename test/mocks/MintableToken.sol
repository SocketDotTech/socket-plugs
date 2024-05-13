pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

// this is a mock token used in tests, other projects' token to be used here
contract MintableToken is ERC20 {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    function mint(address receiver_, uint256 amount_) external {
        _mint(receiver_, amount_);
    }

    function burn(address burner_, uint256 amount_) external {
        _burn(burner_, amount_);
    }
}
