pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "../interfaces/IBridge.sol";
contract ProxyTokenHolder {
    address public bridge;
    address public token;
    constructor(address bridge_, address token_) {
        bridge = bridge_;
        token = token_;
    }

    function bridgeTokens(uint256 amount_ , address receiver_) external payable {
        uint256 currentBalance = ERC20(token).balanceOf(address(this));
        require(currentBalance >= amount_, "ProxyTokenHolder: insufficient balance");
        ERC20(token).approve(bridge, amount_);
        IBridge(bridge).bridge{value:msg.value}(receiver_, amount_, 5000000, 0xE2fA2892d482f469A0A055FcA52a9Ba1B65ABd2e, "", "");
    }
}