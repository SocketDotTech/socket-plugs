pragma solidity 0.8.13;

// import "solmate/utils/SafeTransferLib.sol";
// import {Controller} from "../../common/Base.sol";
// import {IMintableERC20} from "../../interfaces/IMintableERC20.sol";
// import {IFiatTokenV2_1_Mintable} from "./IFiatTokenV2_1_Mintable.sol";
// import {AccessControl} from "../../common/AccessControl.sol";
// import "../../interfaces/IHook.sol";

// contract FiatTokenV2_1_Controller is Controller {
//     using SafeTransferLib for IMintableERC20;

//     constructor(
//         address token_,
//         address exchangeRate_,
//         address hook_
//     ) Controller(token_, exchangeRate_, hook_) {}

//     function _burn(address user_, uint256 burnAmount_) internal override {
//         token.safeTransferFrom(user_, address(this), burnAmount_);
//         IFiatTokenV2_1_Mintable(address(token)).burn(burnAmount_);
//     }
// }
