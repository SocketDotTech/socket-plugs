pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import {VaultWithPayloadBase} from "./VaultWithPayloadBase.sol";

contract NativeVaultWithPayload is VaultWithPayloadBase {
    function _receiveTokens(
        uint256 amount_
    ) internal override returns (uint256 fees) {
        return msg.value - amount_;
    }

    function _sendTokens(address receiver_, uint256 amount_) internal override {
        SafeTransferLib.safeTransferETH(receiver_, amount_);
    }
}
