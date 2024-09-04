// SPDX-License-Identifier: MIT
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
    address public immutable vaultOrController;
    bytes32 public hookType;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(
        address owner_,
        address vaultOrController_
    ) AccessControl(owner_) {
        vaultOrController = vaultOrController_;
        _grantRole(RESCUE_ROLE, owner_);
    }

    modifier isVaultOrController() {
        if (msg.sender != vaultOrController) revert NotAuthorized();
        _;
    }
}
