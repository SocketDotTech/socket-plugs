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
    function updateYield(uint256 amount_) external;

    function calculateMintAmount(uint256 amount_) external returns (uint256);

    function convertToShares(uint256 assets) external view returns (uint256);
}

// limits on underlying or visible tokens
contract YieldTokenLimitExecutionHook is LimitExecutionHook {
    using SafeTransferLib for IMintableERC20;
    using FixedPointMathLib for uint256;

    uint256 public constant MAX_BPS = 10_000;
    IYieldToken public immutable asset__;

    // total yield
    uint256 public totalYield;
    mapping(address => uint256) public lastSyncTimestamp;

    // if true, no funds can be invested in the strategy
    bool public emergencyShutdown;

    event ShutdownStateUpdated(bool shutdownState);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(
        address asset_,
        address controller_,
        address executionHelper_
    ) LimitExecutionHook(msg.sender, controller_, executionHelper_, true) {
        asset__ = IYieldToken(asset_);
        hookType = LIMIT_EXECUTION_YIELD_TOKEN_HOOK;
    }

    // assumed transfer info inputs are validated at controller
    // transfer info data is untrusted
    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        public
        override
        isVaultOrToken
        returns (TransferInfo memory transferInfo, bytes memory postSrcHookData)
    {
        super.srcPreHookCall(params_);
        uint256 amount = params_.transferInfo.amount;
        postSrcHookData = abi.encode(amount);

        totalYield -= amount;
        transferInfo = params_.transferInfo;
        transferInfo.amount = asset__.convertToShares(amount);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory srcPostHookCallParams_
    )
        public
        override
        notShutdown
        isVaultOrToken
        returns (TransferInfo memory transferInfo)
    {
        asset__.updateYield(totalYield);

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
        isVaultOrToken
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (uint256 newYield, ) = abi.decode(
            params_.transferInfo.data,
            (uint256, bytes)
        );

        uint256 oldYield = _poolDstHook(params_.connector, newYield, false);
        totalYield = totalYield + newYield - oldYield;

        if (params_.transferInfo.amount == 0)
            return (abi.encode(0, 0), transferInfo);

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        uint256 sharesToMint = asset__.calculateMintAmount(consumedAmount);

        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = params_.transferInfo;
        transferInfo.amount = sharesToMint;
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     */
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) public override notShutdown returns (CacheData memory cacheData) {
        asset__.updateYield(totalYield);
        return super.dstPostHookCall(params_);
    }

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedAmount The amount consumed from the limit.
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
        uint256 sharesToMint = asset__.calculateMintAmount(transferInfo.amount);
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
    ) public override notShutdown returns (CacheData memory cacheData) {
        return super.postRetryHook(params_);
    }

    function updateEmergencyShutdownState(
        bool shutdownState_
    ) external onlyOwner {
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
    }
}
