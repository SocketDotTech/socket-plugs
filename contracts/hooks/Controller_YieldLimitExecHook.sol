// SPDX-License-Identifier: MIT
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

    function transfer(address to_, uint256 amount_) external returns (bool);

    function convertToAssets(uint256 shares) external view returns (uint256);
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
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        super.srcPreHookCall(params_);
        uint256 amount = params_.transferInfo.amount;
        postHookData = abi.encode(amount);

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
        transferInfo.extraData = abi.encode(
            srcPostHookCallParams_.options,
            srcPostHookCallParams_.transferInfo.extraData
        );
        transferInfo.amount = abi.decode(
            srcPostHookCallParams_.postHookData,
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
        (uint256 increasedUnderlying, bytes memory payload) = abi.decode(
            params_.transferInfo.extraData,
            (uint256, bytes)
        );

        _poolDstHook(params_.connector, increasedUnderlying);
        totalUnderlyingAssets += increasedUnderlying;
        yieldToken__.updateTotalUnderlyingAssets(totalUnderlyingAssets);

        yieldToken__.updateTotalUnderlyingAssets(totalUnderlyingAssets);

        if (params_.transferInfo.amount == 0)
            return (abi.encode(0, 0, 0, address(0)), transferInfo);

        (uint256 consumedUnderlying, uint256 pendingUnderlying) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        uint256 sharesToMint = yieldToken__.calculateMintAmount(
            params_.transferInfo.amount
        );

        postHookData = abi.encode(
            consumedUnderlying,
            pendingUnderlying,
            params_.transferInfo.amount,
            params_.transferInfo.receiver
        );

        transferInfo = params_.transferInfo;
        if (pendingUnderlying != 0) transferInfo.receiver = address(this);
        transferInfo.amount = sharesToMint;
        transferInfo.extraData = payload;
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     */
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    )
        public
        override
        isVaultOrController
        notShutdown
        returns (CacheData memory cacheData)
    {
        (
            uint256 consumedUnderlying,
            uint256 pendingUnderlying,
            uint256 depositUnderlying,
            address receiver
        ) = abi.decode(
                params_.postHookData,
                (uint256, uint256, uint256, address)
            );
        bytes memory execPayload = params_.transferInfo.extraData;

        uint256 connectorPendingShares = _getConnectorPendingAmount(
            params_.connectorCache
        );

        uint256 pendingShares;
        if (pendingUnderlying > 0) {
            // totalShares * consumedU / totalU
            uint256 consumedShares = (params_.transferInfo.amount *
                pendingUnderlying) / depositUnderlying;

            pendingShares = params_.transferInfo.amount - consumedShares;

            cacheData.identifierCache = abi.encode(
                params_.transferInfo.receiver,
                pendingShares,
                params_.connector,
                execPayload
            );
            yieldToken__.transfer(receiver, consumedUnderlying);

            emit TokensPending(
                params_.connector,
                params_.transferInfo.receiver,
                consumedShares,
                pendingShares,
                params_.messageId
            );
        } else {
            if (execPayload.length > 0) {
                // execute
                bool success = executionHelper__.execute(
                    params_.transferInfo.receiver,
                    execPayload,
                    params_.messageId,
                    depositUnderlying
                );

                if (success) {
                    emit MessageExecuted(
                        params_.messageId,
                        params_.transferInfo.receiver
                    );
                    cacheData.identifierCache = new bytes(0);
                } else
                    cacheData.identifierCache = abi.encode(
                        params_.transferInfo.receiver,
                        0,
                        params_.connector,
                        execPayload
                    );
            } else cacheData.identifierCache = new bytes(0);
        }

        cacheData.connectorCache = abi.encode(
            connectorPendingShares + pendingShares
        );
    }

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedUnderlying The amount consumed from the limit.
    //  * @return postHookData The post-hook data to be processed after the retry hook execution.
    //  */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        public
        override
        isVaultOrController
        notShutdown
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (
            address receiver,
            uint256 totalPendingShares,
            address connector,

        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );

        if (connector != params_.connector) revert InvalidConnector();

        (uint256 consumedShares, uint256 pendingShares) = _limitDstHook(
            params_.connector,
            totalPendingShares
        );

        postHookData = abi.encode(receiver, consumedShares, pendingShares);
        uint256 consumedUnderlying = yieldToken__.convertToAssets(
            consumedShares
        );
        yieldToken__.transfer(receiver, consumedUnderlying);

        transferInfo = TransferInfo(transferInfo.receiver, 0, bytes(""));
    }

    // /**
    //  * @notice Handles post-retry hook logic after execution.
    //  * @dev This function updates the identifier cache and sibling chain cache based on the post-hook data.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @param postHookData_ The post-hook data containing updated receiver and consumed/pending amounts.
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
