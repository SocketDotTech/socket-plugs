// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../common/Errors.sol";
import "../common/Constants.sol";
import "./HookBase.sol";
import {IWrapERC20} from "../interfaces/IWrapERC20.sol";

/**
 * @title Contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
contract UnwrapHook is HookBase {
    address public socketGhstAddress;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(
        address owner_,
        address controller_,
        address socketGhstAddress_
    ) HookBase(owner_, controller_) {
        socketGhstAddress = socketGhstAddress_;
    }

    // this should be run in Geist/Polter
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) external isVaultOrController returns (CacheData memory cacheData) {
        // unwrap
        IWrapERC20(socketGhstAddress).withdraw(
            params_.transferInfo.amount,
            params_.transferInfo.receiver
        );

        cacheData = CacheData(bytes(""), abi.encode(0));
    }

    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        external
        payable
        isVaultOrController
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        //  Check if user's wrapped GHST balance is enough, if not deposit ETH
        if (
            params_.transferInfo.amount >
            IWrapERC20(socketGhstAddress).balanceOf(
                params_.transferInfo.receiver
            )
        ) {
            //Calculate how much is needed to cover the deposit
            uint256 ethNeeded = params_.transferInfo.amount -
                IWrapERC20(socketGhstAddress).balanceOf(
                    params_.transferInfo.receiver
                );

            //Revert if the user doesn't have enough
            require(
                params_.transferInfo.receiver.balance >= ethNeeded,
                "Insufficient balance"
            );
            require(msg.value >= ethNeeded, "Insufficient token amount");

            // Deposit native ETH to cover the difference
            IWrapERC20(socketGhstAddress).deposit{value: ethNeeded}(
                params_.transferInfo.receiver
            );

            // Refund excess amount if there's any
            uint256 excessAmount = msg.value - ethNeeded;
            if (excessAmount > 0) {
                (bool success, ) = msg.sender.call{value: excessAmount}("");
                require(success, "Failed to send refund");
            }
        }

        return (params_.transferInfo, bytes(""));
    }

    function srcPostHookCall(
        SrcPostHookCallParams calldata params_
    ) external isVaultOrController returns (TransferInfo memory transferInfo) {
        return params_.transferInfo;
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
        return (bytes(""), params_.transferInfo);
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
