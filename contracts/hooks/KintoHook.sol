// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./LimitHook.sol";

interface IKintoID {
    function isKYC(address) external view returns (bool);
}

interface IKintoFactory {
    function walletTs(address) external view returns (uint256);
}

interface IKintoWallet {
    function isFunderWhitelisted(address) external view returns (bool);
}

/**
 * @title Kinto Hook
 * @notice TODO
 */
contract KintoHook is LimitHook {
    IKintoID public immutable kintoID;
    IKintoFactory public immutable kintoFactory;

    error KYCRequired();
    error SenderNotAllowed();

    /**
     * @notice Constructor for creating a Kinto Hook
     * @param owner_ Owner of this contract.
     */
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_,
        address kintoID_,
        address kintoFactory_
    ) LimitHook(owner_, controller_, useControllerPools_) {
        hookType = keccak256("KINTO");
        kintoID = IKintoID(kintoID_);
        kintoFactory = IKintoFactory(kintoFactory_);
    }

    function srcPreHookCall(
        SrcPreHookCallParams memory params_
    )
        public
        override
        isVaultOrController
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        if (!kintoID.isKYC(params_.msgSender)) revert KYCRequired();
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
        address receiver = params_.transferInfo.receiver;
        // get sender from encoded params_.data
        address msgSender = abi.decode(params_.transferInfo.data, (address));

        // save the sender in the cache for the post-retry hook
        postHookData = params_.transferInfo.data;

        bool isKintoWallet = kintoFactory.walletTs(receiver) > 0;
        if (
            !isKintoWallet ||
            !IKintoWallet(receiver).isFunderWhitelisted(msgSender)
        ) revert SenderNotAllowed();

        return super.dstPreHookCall(params_);
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) public override isVaultOrController returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }

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
