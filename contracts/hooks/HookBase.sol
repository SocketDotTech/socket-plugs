pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "../common/Errors.sol";
import "../common/Constants.sol";
import "../interfaces/IHook.sol";
import "../utils/RescueBase.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
abstract contract HookBase is ReentrancyGuard, IHook, RescueBase {
    address public immutable controller;
    bytes32 public hookType;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(address owner_, address controller_) AccessControl(owner_) {
        controller = controller_;
    }

    modifier isVaultOrToken() {
        if (msg.sender != controller) revert NotAuthorized();
        _;
    }
}
