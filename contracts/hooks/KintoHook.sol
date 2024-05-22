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
    function owners(uint256) external view returns (address);
}

/**
 * @title Kinto Hook
 * @notice meant to be deployed only Kinto. Inherits from LimitHook. Overrides the following functions:
 *  - on srcPreHookCall, which is called when a user on Kinto wants to "withdraw" (bridge out), it checks if the user is KYC'd. If not, it reverts.
 *  - on dstPreHookCall, which is called when a user wants to bridge in assets into Kinto, it checks if the original sender (the one that initiated the transaction on the vault chain) is an address included in funderWhitelist of the user's KintoWallet. If not, it reverts. The original sender is passed as an encoded param through the SenderHook.
 */
contract KintoHook is LimitHook {
    address public constant BRIDGER_L2 =
        0x26181Dfc530d96523350e895180b09BAf3d816a0;
    IKintoID public immutable kintoID;
    IKintoFactory public immutable kintoFactory;

    error InvalidSender(address sender);
    error InvalidReceiver(address sender);
    error KYCRequired();
    error ReceiverNotAllowed(address receiver);
    error SenderNotAllowed(address sender);

    /**
     * @notice Constructor for creating a Kinto Hook
     * @param owner_ Owner of this contract.
     * @param controller_ Controller of this contract.
     * @param useControllerPools_ Whether to use controller pools.
     * @param kintoID_ KintoID contract address.
     * @param kintoFactory_ KintoFactory contract address.
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
        address sender = params_.msgSender;
        if (kintoFactory.walletTs(sender) == 0) revert InvalidSender(sender);
        if (!kintoID.isKYC(IKintoWallet(sender).owners(0)))
            revert KYCRequired();

        address receiver = params_.transferInfo.receiver;
        if (!IKintoWallet(sender).isFunderWhitelisted(receiver))
            revert ReceiverNotAllowed(receiver);

        return super.srcPreHookCall(params_);
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
        address msgSender = abi.decode(params_.transferInfo.data, (address));

        if (receiver != BRIDGER_L2) {
            if (kintoFactory.walletTs(receiver) == 0)
                revert InvalidReceiver(receiver);
            if (!kintoID.isKYC(IKintoWallet(receiver).owners(0)))
                revert KYCRequired();
            if (!IKintoWallet(receiver).isFunderWhitelisted(msgSender))
                revert SenderNotAllowed(msgSender);
        }

        return super.dstPreHookCall(params_);
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) public override isVaultOrController returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }
}
