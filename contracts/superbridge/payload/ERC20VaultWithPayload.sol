pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import {VaultWithPayloadBase} from "./VaultWithPayloadBase.sol";

contract ERC20VaultWithPayload is VaultWithPayloadBase {
    using SafeTransferLib for ERC20;
    ERC20 public immutable token__;

    constructor(address token_) {
        token__ = ERC20(token_);
    }

    function _receiveTokens(
        uint256 amount_
    ) internal override returns (uint256 fees) {
        token__.safeTransferFrom(msg.sender, address(this), amount_);
        return msg.value;
    }

    function _sendTokens(address receiver_, uint256 amount_) internal override {
        token__.safeTransfer(receiver_, amount_);
    }
}
