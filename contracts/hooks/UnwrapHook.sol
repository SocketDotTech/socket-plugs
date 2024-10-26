// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "../common/Errors.sol";
import "../common/Constants.sol";
import "../interfaces/IHook.sol";
import "../utils/RescueBase.sol";
import {IWrapERC20} from "../interfaces/IWrapERC20.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
contract UnwrapHook is ReentrancyGuard, RescueBase {
    address public immutable vaultOrController;
    bytes32 public hookType;
    address public socketGhstAddress;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(
        address owner_,
        address vaultOrController_,
        address socketGhstAddress_
    ) AccessControl(owner_) {
        vaultOrController = vaultOrController_;
        socketGhstAddress = socketGhstAddress_;
        _grantRole(RESCUE_ROLE, owner_);
    }

    // this should be run in Geist/Polter
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) external isVaultOrController returns (CacheData memory cacheData) {
        // unwrap
        IWrapERC20(socketGhstAddress).withdraw(params_.transferInfo.amount);

        cacheData = CacheData(bytes(""), abi.encode(0));
    }

    modifier isVaultOrController() {
        if (msg.sender != vaultOrController) revert NotAuthorized();
        _;
    }
}
