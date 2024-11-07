// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../common/Errors.sol";
import "../common/Constants.sol";
import "./HookBase.sol";
import {IWrapERC20} from "../interfaces/IWrapERC20.sol";
import "solmate/tokens/ERC20.sol";
import "solmate/utils/SafeTransferLib.sol";

/**
 * @title Contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
contract UnwrapHook is HookBase {
    using SafeTransferLib for ERC20;

    address public ghstAddress;
    address public treasuryAddress;

    event TreasuryUpdated(address newTreasury);

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(
        address owner_,
        address controller_,
        address ghstAddress_,
        address treasuryAddress_
    ) HookBase(owner_, controller_) {
        ghstAddress = ghstAddress_;
        treasuryAddress = treasuryAddress_;
    }

    function updateTreasury(address newTreasury_) external onlyOwner {
        treasuryAddress = newTreasury_;
        emit TreasuryUpdated(treasuryAddress);
    }

    /**
     * @notice Executes pre-hook call for destination underlyingAsset.
     * @dev This function is used to execute a pre-hook call for the destination underlyingAsset before initiating a transfer.
     * @param params_ Parameters for the pre-hook call.
     */
    function dstPreHookCall(
        DstPreHookCallParams calldata params_
    )
        external
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        transferInfo.receiver = params_.transferInfo.receiver;

        uint256 fee;
        if (block.chainid == 137 || block.chainid == 80002) {
            fee = params_.transferInfo.amount / 1000; // fee: 0.1%
        }
        transferInfo.amount = params_.transferInfo.amount - fee; // Deduct the fee
        postHookData = abi.encode(fee);
    }

    // this should be run in Geist/Polter
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) external isVaultOrController returns (CacheData memory cacheData) {
        // Transfer the fee to the treasury address
        uint256 fee = abi.decode(params_.postHookData, (uint256));
        if (fee > 0) {
            // transfer fees
            ERC20(ghstAddress).safeTransferFrom(
                msg.sender,
                treasuryAddress,
                fee
            );
        }

        // unwrap
        if (block.chainid == 63157 || block.chainid == 631571) {
            // unwrap for Geist network
            IWrapERC20(ghstAddress).withdraw(
                params_.transferInfo.amount,
                params_.transferInfo.receiver
            );
        }

        cacheData = CacheData(bytes(""), abi.encode(0));
    }

    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        external
        isVaultOrController
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        return (params_.transferInfo, bytes(""));
    }

    function srcPostHookCall(
        SrcPostHookCallParams calldata params_
    ) external isVaultOrController returns (TransferInfo memory transferInfo) {
        return params_.transferInfo;
    }

    function preRetryHook(
        PreRetryHookCallParams memory params_
    )
        external
        nonReentrant
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        postHookData = bytes("");
        transferInfo = TransferInfo(address(0), 0, bytes(""));
        return (postHookData, transferInfo);
    }

    function postRetryHook(
        PostRetryHookCallParams calldata params_
    )
        external
        isVaultOrController
        nonReentrant
        returns (CacheData memory cacheData)
    {
        cacheData = CacheData(bytes(""), abi.encode(0));
        return cacheData;
    }
}