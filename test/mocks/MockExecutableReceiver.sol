pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

// this is a mock token used in tests, other projects' token to be used here
contract MockExecutableReceiver {
    ERC20 public token__;
    address public admin;
    uint256 public counter;

    error TransferFailed();
    error InvalidAmount();

    constructor(address admin_, address token_) {
        admin = admin_;
        token__ = ERC20(token_);
    }

    function incrementCounter() external {
        counter++;
    }

    function transferFundsToAdmin(uint256 amount_) external {
        if (amount_ > 50 && counter == 0) {
            revert InvalidAmount();
        }
        bool success = token__.transfer(admin, amount_);
        if (!success) revert TransferFailed();
    }
}
