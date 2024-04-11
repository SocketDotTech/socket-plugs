pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./RescueBase.sol";
import "solmate/utils/SafeTransferLib.sol";

contract HelperContract is RescueBase {
    using SafeTransferLib for ERC20;
    address public immutable token;

    constructor(address token_) AccessControl(msg.sender) {
        token = token_;
        _grantRole(RESCUE_ROLE, msg.sender);
    }

    function getTokens(address receiver_, uint256 amount_) external {
        if (amount_ == 0) return;
        ERC20(token).safeTransfer(receiver_, amount_);
    }
}
