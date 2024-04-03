// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import {IMintableERC20} from "../interfaces/IMintableERC20.sol";
import "solmate/utils/SafeTransferLib.sol";
import {IConnector} from "../ConnectorPlug.sol";
import "./LimitExecutionHook.sol";

interface IYieldToken {
    function updateTotalUnderlyingAssets(uint256 amount_) external;

    function calculateMintAmount(uint256 amount_) external returns (uint256);

    function convertToShares(
        uint256 underlyingAssets
    ) external view returns (uint256);
}

// limits on underlying or visible tokens
contract Controller_YieldLimitExecHook is LimitExecutionHook {
    using SafeTransferLib for IMintableERC20;
    using FixedPointMathLib for uint256;

    uint256 private constant MAX_BPS = 10_000;
    IYieldToken public immutable yieldToken__;

    // total yield
    uint256 public totalUnderlyingAssets;

    // if true, no funds can be invested in the strategy
    bool public emergencyShutdown;

    event ShutdownStateUpdated(bool shutdownState);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(
        address underlyingAsset_,
        address controller_,
        address executionHelper_
    ) LimitExecutionHook(msg.sender, controller_, executionHelper_, true) {
        yieldToken__ = IYieldToken(underlyingAsset_);
        hookType = LIMIT_EXECUTION_YIELD_TOKEN_HOOK;
        _grantRole(LIMIT_UPDATER_ROLE, msg.sender);
    }

    // assumed transfer info inputs are validated at controller
    // transfer info data is untrusted
    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        public
        override
        notShutdown
        returns (TransferInfo memory transferInfo, bytes memory postSrcHookData)
    {
        super.srcPreHookCall(params_);
        uint256 amount = params_.transferInfo.amount;
        postSrcHookData = abi.encode(amount);

        totalUnderlyingAssets -= amount;
        transferInfo = params_.transferInfo;
        transferInfo.amount = yieldToken__.convertToShares(amount);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory srcPostHookCallParams_
    )
        public
        override
        isVaultOrController
        returns (TransferInfo memory transferInfo)
    {
        yieldToken__.updateTotalUnderlyingAssets(totalUnderlyingAssets);

        transferInfo.receiver = srcPostHookCallParams_.transferInfo.receiver;
        transferInfo.data = abi.encode(
            srcPostHookCallParams_.options,
            srcPostHookCallParams_.transferInfo.data
        );
        transferInfo.amount = abi.decode(
            srcPostHookCallParams_.postSrcHookData,
            (uint256)
        );
    }

    /**
     * @notice This function is called before the execution of a destination hook.
     * @dev It checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
     */
    function dstPreHookCall(
        DstPreHookCallParams calldata params_
    )
        public
        override
        notShutdown
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (uint256 increasedYield, bytes memory payload) = abi.decode(
            params_.transferInfo.data,
            (uint256, bytes)
        );

        _poolDstHook(params_.connector, increasedYield);
        totalUnderlyingAssets += increasedYield;

        yieldToken__.updateTotalUnderlyingAssets(totalUnderlyingAssets);

        if (params_.transferInfo.amount == 0)
            return (abi.encode(0, 0, 0), transferInfo);

        (uint256 consumedUnderlying, uint256 pendingUnderlying) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        uint256 sharesToMint = yieldToken__.calculateMintAmount(
            consumedUnderlying
        );

        postHookData = abi.encode(
            consumedUnderlying,
            pendingUnderlying,
            params_.transferInfo.amount
        );
        transferInfo = params_.transferInfo;
        transferInfo.amount = sharesToMint;
        transferInfo.data = payload;
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     */
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) public override returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedUnderlying The amount consumed from the limit.
    //  * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
    //  */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        public
        override
        notShutdown
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (postRetryHookData, transferInfo) = super.preRetryHook(params_);
        uint256 sharesToMint = yieldToken__.calculateMintAmount(
            transferInfo.amount
        );
        transferInfo = TransferInfo(
            transferInfo.receiver,
            sharesToMint,
            bytes("")
        );
    }

    // /**
    //  * @notice Handles post-retry hook logic after execution.
    //  * @dev This function updates the identifier cache and sibling chain cache based on the post-hook data.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @param postRetryHookData_ The post-hook data containing updated receiver and consumed/pending amounts.
    //  * @return newIdentifierCache The updated identifier cache.
    //  * @return newConnectorCache The updated sibling chain cache.
    //  */
    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) public override returns (CacheData memory cacheData) {
        return super.postRetryHook(params_);
    }

    function updateEmergencyShutdownState(
        bool shutdownState_
    ) external onlyOwner {
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
    }
}
