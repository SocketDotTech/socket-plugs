// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./LimitHook.sol";

/**
 * @title Sender Hook
 * @notice It only defines behaviour for `srcPreHookCall` to include the sender in the TransferInfo data field.
 */
contract SenderHook is LimitHook {
    /**
     * @title Sender Hook
     * @notice meant to be deployed only on vault chains (all except Kinto).
     * Overrides `srcPreHookCall` to pass the `msg.sender` so that it can be used 
     * in the `dstPreHookCall` on Kinto chain.
     * @param owner_ Owner of this contract.
     * @param controller_ Controller of this contract.
     * @param useControllerPools_ Whether to use controller pools.
     */
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_
    ) LimitHook(owner_, controller_, useControllerPools_) {
        hookType = keccak256("KINTO");
    }

    function srcPreHookCall(
        SrcPreHookCallParams memory params_
    )
        public
        override
        isVaultOrController
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        // add `msgSender` inside data field
        params_.transferInfo.data = abi.encode(params_.msgSender);
        super.srcPreHookCall(params_);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory params_
    ) public view override isVaultOrController returns (TransferInfo memory) {
        return super.srcPostHookCall(params_);
    }

    function dstPreHookCall(
        DstPreHookCallParams memory params_
    )
        public
        override
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        return super.dstPreHookCall(params_);
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) public override isVaultOrController returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }

    /// @dev not needed for this hook
    function preRetryHook(
        PreRetryHookCallParams memory params_
    )
        public
        override
        nonReentrant
        isVaultOrController
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        return super.preRetryHook(params_);
    }

    /// @dev not needed for this hook
    function postRetryHook(
        PostRetryHookCallParams calldata params_
    )
        public
        override
        isVaultOrController
        nonReentrant
        returns (CacheData memory cacheData)
    {
        return super.postRetryHook(params_);
    }
}
