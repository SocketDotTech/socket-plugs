pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import {Controller} from "../Controller.sol";
import {IMintableERC20} from "../MintableToken.sol";

// USDC's standard token
interface FiatTokenV2_1_Burnable {
    function burn(uint256 _amount) external;
}

contract FiatTokenV2_1_Controller is Controller {
    constructor(
        address token_,
        address exchangeRate_
    ) Controller(token_, exchangeRate_) {
        // token__ = IMintableERC20(token_);
        // exchangeRate__ = IExchangeRate(exchangeRate_);
    }

    using SafeTransferLib for IMintableERC20;

    function _burn(address user_, uint256 burnAmount_) internal override {
        token__.safeTransferFrom(user_, address(this), burnAmount_);
        FiatTokenV2_1_Burnable(address(token__)).burn(burnAmount_);
    }
}
