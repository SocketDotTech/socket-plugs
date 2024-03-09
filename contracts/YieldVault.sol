pragma solidity 0.8.13;

import "./Vault.sol";

contract YieldVault is Vault {
    constructor(address token_) Vault(token_) {}

    function sync(
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata options_
    ) external payable nonReentrant {
        _afterBridge(
            msgGasLimit_,
            connector_,
            options_,
            TransferInfo(address(0), 0, 0)
        );
    }
}
