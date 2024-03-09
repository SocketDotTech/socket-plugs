pragma solidity 0.8.13;

import "../../contracts/controllers/FiatTokenV2_1/IFiatTokenV2_1_Mintable.sol";

// this is a mock token used in tests, other projects' token to be used here
contract FiatTokenV2_1_Mintable is IFiatTokenV2_1_Mintable {
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) {}

    function mint(address receiver_, uint256 amount_) external override {
        _mint(receiver_, amount_);
    }

    function burn(uint256 amount_) external override {
        _burn(msg.sender, amount_);
    }
}
