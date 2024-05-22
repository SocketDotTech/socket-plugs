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
 * @notice meant to be deployed only Kinto. Inherits from LimitHook.
 */
contract KintoHook is LimitHook {
    address public constant BRIDGER_L2 =
        0x26181Dfc530d96523350e895180b09BAf3d816a0;
    IKintoID public immutable kintoID;
    IKintoFactory public immutable kintoFactory;

    // addresses that can bypass funder whitelisted check on dstPreHookCall
    mapping(address => bool) public senderAllowlist;

    error InvalidSender(address sender);
    error InvalidReceiver(address sender);
    error KYCRequired();
    error SenderNotAllowed(address sender);

    event SenderSet(address indexed sender, bool allowed);

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

    /*
     * @notice Sets a sender to be allowed (or not) to send funds to a Kinto wallet bypassing Kinto checks
     */
    function setSender(address sender, bool allowed) external onlyOwner {
        senderAllowlist[sender] = allowed;
        emit SenderSet(sender, allowed);
    }

    /**
     * @dev called when Kinto user wants to "withdraw" (bridge out). Checks if sender is a KintoWallet,
     * if the wallet's signer is KYC'd and if the receiver of the funds is whitelisted.
     */
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

        return super.srcPreHookCall(params_);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory params_
    ) public view override isVaultOrController returns (TransferInfo memory) {
        return super.srcPostHookCall(params_);
    }

    /**
     * @dev called when user wants to bridge assets into Kinto. It checks if the receiver
     * is a Kinto Wallet, if the wallet's signer is KYC'd and if the "original sender"
     * (initiator of the tx on the vault chain) is whitelisted on the receiver's KintoWallet.
     *
     * If the receiver is the bridger L2, it skips all the checks.
     * The "original sender" is passed as an encoded param through the SenderHook.
     * If the sender is not in the allowlist (e.g Bridger L1), it checks it's whitelisted on the receiver's KintoWallet.
     */
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
            if (!senderAllowlist[msgSender]) {
                if (!IKintoWallet(receiver).isFunderWhitelisted(msgSender))
                    revert SenderNotAllowed(msgSender);
            }
        }

        return super.dstPreHookCall(params_);
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) public override isVaultOrController returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }
}
