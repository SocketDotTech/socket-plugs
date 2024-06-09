pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

contract MintableERC20 is ERC20 {

    constructor(string memory name_, string memory symbol_, uint8 decimals_) ERC20(name_, symbol_, decimals_) {
        _mint(msg.sender, 1000000000000000000000000);
    }
    function mint(address receiver_, uint256 amount_) external {
        _mint(receiver_, amount_);
    }

    function burn(address user_, uint256 _amount) external {
        _burn(user_, _amount);
    }
}