pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import {Controller} from "../Controller.sol";
import {IMintableERC20} from "../IMintableERC20.sol";
import {IFiatTokenV2_1_Mintable} from "./IFiatTokenV2_1_Mintable.sol";

contract FiatTokenV2_1_Controller is Controller {
    using SafeTransferLib for IMintableERC20;

    constructor(
        address token_,
        address exchangeRate_
    ) Controller(token_, exchangeRate_) {}

    function _burn(address user_, uint256 burnAmount_) internal override {
        token__.safeTransferFrom(user_, address(this), burnAmount_);
        IFiatTokenV2_1_Mintable(address(token__)).burn(burnAmount_);
    }
}
