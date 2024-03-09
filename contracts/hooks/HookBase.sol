pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "../common/Errors.sol";
import "../interfaces/IHook.sol";
import "../utils/RescueBase.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
abstract contract HookBase is ReentrancyGuard, IHook, RescueBase {
    address public immutable vaultOrToken;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(address owner_, address vaultOrToken_) AccessControl(owner_) {
        vaultOrToken = vaultOrToken_;
    }

    modifier isVaultOrToken() {
        if (msg.sender != vaultOrToken) revert NotAuthorized();
        _;
    }

    modifier isValidReceiver(address receiver_) {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        _;
    }
}
