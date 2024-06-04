// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {IFiatTokenV2_1_Mintable} from "./IFiatTokenV2_1_Mintable.sol";
import "../Controller.sol";

contract FiatTokenV2_1_Controller is Controller {
    using SafeTransferLib for ERC20;

    constructor(address token_) Controller(token_) {
        bridgeType = FIAT_TOKEN_CONTROLLER;
    }

    function _burn(address user_, uint256 burnAmount_) internal override {
        ERC20(token).safeTransferFrom(user_, address(this), burnAmount_);
        IFiatTokenV2_1_Mintable(address(token)).burn(burnAmount_);
    }
}
