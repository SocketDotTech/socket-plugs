pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import "solmate/auth/Owned.sol";
abstract contract IMintableERC20 is ERC20 {
    function mint(address receiver_, uint256 amount_) external virtual;

    function burn(address burner_, uint256 amount_) external virtual;
}

contract MintableToken is IMintableERC20, Owned {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address owner_
    ) ERC20(name_, symbol_, decimals_) Owned(owner_) {}

    function mint(address receiver_, uint256 amount_) external onlyOwner override {
        _mint(receiver_, amount_);
    }

    function burn(address burner_, uint256 amount_) external onlyOwner override {
        _burn(burner_, amount_);
    }
}
