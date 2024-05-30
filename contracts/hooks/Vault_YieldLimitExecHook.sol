// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import "solmate/tokens/ERC20.sol";

import "solmate/utils/SafeTransferLib.sol";
import {IConnector} from "../ConnectorPlug.sol";

import "./LimitExecutionHook.sol";

contract Vault_YieldLimitExecHook is LimitExecutionHook {
    using SafeTransferLib for ERC20;
    using FixedPointMathLib for uint256;

    uint256 private constant MAX_BPS = 10_000;

    IStrategy public strategy; // address of the strategy contract
    ERC20 public immutable underlyingAsset__;

    uint256 public totalLockedInStrategy; // total funds deposited in strategy

    uint256 public totalIdle; // Amount of tokens that are in the vault
    uint256 public totalDebt; // Amount of tokens that strategy have borrowed
    uint128 public lastRebalanceTimestamp; // Timestamp of last rebalance

    uint128 public rebalanceDelay; // Delay between rebalance
    uint256 public debtRatio; // Debt ratio for the Vault (in BPS, <= 10k)
    bool public emergencyShutdown; // if true, no funds can be invested in the strategy

    uint256 public lastTotalUnderlyingAssetsSynced;

    event WithdrawFromStrategy(uint256 withdrawn);
    event Rebalanced(
        uint256 totalIdle,
        uint256 totalDebt,
        uint256 credit,
        uint256 debtOutstanding
    );
    event ShutdownStateUpdated(bool shutdownState);
    event DebtRatioUpdated(uint256 debtRatio);
    event StrategyUpdated(address strategy);
    event RebalanceDelayUpdated(uint128 rebalanceDelay);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(
        uint256 debtRatio_,
        uint128 rebalanceDelay_,
        address strategy_,
        address underlyingAsset_,
        address vault_,
        address executionHelper_,
        bool useControllerPools_
    )
        LimitExecutionHook(
            msg.sender,
            vault_,
            executionHelper_,
            useControllerPools_
        )
    {
        underlyingAsset__ = ERC20(underlyingAsset_);
        debtRatio = debtRatio_;
        rebalanceDelay = rebalanceDelay_;
        strategy = IStrategy(strategy_);
        hookType = LIMIT_EXECUTION_YIELD_HOOK;
        _grantRole(LIMIT_UPDATER_ROLE, msg.sender);
    }

    /**
     * @dev This function calls the srcHookCall function of the connector contract,
     * passing in the receiver, amount, siblingChainSlug, extradata, and msg.sender, and returns
     * the updated receiver, amount, and extradata.
     */
    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    ) public override notShutdown returns (TransferInfo memory, bytes memory) {
        totalIdle += params_.transferInfo.amount;
        return super.srcPreHookCall(params_);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory srcPostHookCallParams_
    )
        public
        override
        isVaultOrController
        returns (TransferInfo memory transferInfo)
    {
        _checkDelayAndRebalance();

        uint256 totalUnderlyingAsset = strategy.estimatedTotalAssets() +
            totalIdle;
        uint256 totalYieldSync = totalUnderlyingAsset -
            lastTotalUnderlyingAssetsSynced;
        lastTotalUnderlyingAssetsSynced = totalUnderlyingAsset;

        transferInfo = srcPostHookCallParams_.transferInfo;
        if (srcPostHookCallParams_.transferInfo.amount == 0) {
            transferInfo.extraData = abi.encode(totalYieldSync, bytes(""));
        } else {
            transferInfo.extraData = abi.encode(
                totalYieldSync,
                srcPostHookCallParams_.transferInfo.extraData
            );
        }
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
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (postHookData, transferInfo) = super.dstPreHookCall(params_);

        // ensure vault have enough idle underlyingAssets
        if (transferInfo.amount > totalUnderlyingAssets())
            revert NotEnoughAssets();

        (bytes memory options_, bytes memory payload_) = abi.decode(
            params_.transferInfo.extraData,
            (bytes, bytes)
        );
        bool pullFromStrategy = abi.decode(options_, (bool));

        if (transferInfo.amount > totalIdle) {
            if (pullFromStrategy) {
                _withdrawFromStrategy(transferInfo.amount - totalIdle);
            } else {
                (
                    uint256 consumedUnderlying,
                    uint256 pendingUnderlying,
                    uint256 bridgeUnderlying
                ) = abi.decode(postHookData, (uint256, uint256, uint256));

                pendingUnderlying += transferInfo.amount - totalIdle;
                postHookData = abi.encode(
                    transferInfo.amount,
                    pendingUnderlying,
                    bridgeUnderlying
                );
                transferInfo.amount = totalIdle;

                // Update the lastUpdateLimit as consumedAmount is reduced to totalIdle. This is to ensure that the
                // receiving limit is updated by correct transferred amount.
                LimitParams storage receivingParams = _receivingLimitParams[
                    params_.connector
                ];

                receivingParams.lastUpdateLimit +=
                    consumedUnderlying -
                    transferInfo.amount;
            }
            totalIdle = 0;
        } else totalIdle -= transferInfo.amount;

        transferInfo.extraData = payload_;
        transferInfo.receiver = params_.transferInfo.receiver;
    }

    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) public override returns (CacheData memory cacheData) {
        return super.dstPostHookCall(params_);
    }

    /**
     * @notice Handles pre-retry hook logic before execution.
     * @dev This function can be used to mint funds which were in a pending state due to limits.
     */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        public
        override
        notShutdown
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (postHookData, transferInfo) = super.preRetryHook(params_);
        if (transferInfo.amount > totalIdle) {
            _withdrawFromStrategy(transferInfo.amount - totalIdle);
            totalIdle = 0;
        } else totalIdle -= transferInfo.amount;
    }

    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) public override returns (CacheData memory cacheData) {
        return super.postRetryHook(params_);
    }

    function withdrawFromStrategy(
        uint256 underlyingAsset_
    ) external onlyOwner returns (uint256) {
        return _withdrawFromStrategy(underlyingAsset_);
    }

    function _withdrawFromStrategy(
        uint256 underlyingAsset_
    ) internal returns (uint256 withdrawn) {
        uint256 preBalance = underlyingAsset__.balanceOf(address(this));
        strategy.withdraw(underlyingAsset_);
        withdrawn = underlyingAsset__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt -= withdrawn;

        underlyingAsset__.transfer(vaultOrController, withdrawn);
        emit WithdrawFromStrategy(withdrawn);
    }

    function _withdrawAllFromStrategy() internal returns (uint256) {
        uint256 preBalance = underlyingAsset__.balanceOf(address(this));
        strategy.withdrawAll();
        uint256 withdrawn = underlyingAsset__.balanceOf(address(this)) -
            preBalance;
        totalIdle += withdrawn;
        totalDebt = 0;

        underlyingAsset__.transfer(vaultOrController, withdrawn);
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }

    function rebalance() external notShutdown {
        _rebalance();
    }

    function _checkDelayAndRebalance() internal {
        uint128 timeElapsed = uint128(block.timestamp) - lastRebalanceTimestamp;
        if (timeElapsed >= rebalanceDelay) {
            _rebalance();
        }
    }

    function _rebalance() internal {
        if (address(strategy) == address(0)) return;
        lastRebalanceTimestamp = uint128(block.timestamp);
        // Compute the line of credit the Vault is able to offer the Strategy (if any)
        uint256 credit = _creditAvailable();
        uint256 pendingDebt = _debtOutstanding();

        if (credit > 0) {
            // Credit surplus, give to Strategy
            totalIdle -= credit;
            totalDebt += credit;
            totalLockedInStrategy += credit;
            underlyingAsset__.safeTransferFrom(
                vaultOrController,
                address(strategy),
                credit
            );
            strategy.invest();
        } else if (pendingDebt > 0) {
            // Credit deficit, take from Strategy
            _withdrawFromStrategy(pendingDebt);
        }

        emit Rebalanced(totalIdle, totalDebt, credit, pendingDebt);
    }

    /// @notice Returns the total quantity of all underlyingAssets under control of this
    ///    Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @return total quantity of all underlyingAssets under control of this Vault
    function totalUnderlyingAssets() public view returns (uint256) {
        return strategy.estimatedTotalAssets() + totalIdle;
    }

    function _creditAvailable() internal view returns (uint256) {
        uint256 vaultTotalAssets = totalUnderlyingAssets();
        uint256 vaultDebtLimit = (debtRatio * vaultTotalAssets) / MAX_BPS;
        uint256 vaultTotalDebt = totalDebt;

        if (vaultDebtLimit <= vaultTotalDebt) return 0;

        // Start with debt limit left for the Strategy
        uint256 availableCredit = vaultDebtLimit - vaultTotalDebt;

        // Can only borrow up to what the contract has in reserve
        // NOTE: Running near 100% is discouraged
        return Math.min(availableCredit, totalIdle);
    }

    function creditAvailable() external view returns (uint256) {
        // @notice
        //     Amount of tokens in Vault a Strategy has access to as a credit line.
        //     This will check the Strategy's debt limit, as well as the tokens
        //     available in the Vault, and determine the maximum amount of tokens
        //     (if any) the Strategy may draw on.
        //     In the rare case the Vault is in emergency shutdown this will return 0.
        // @param strategy The Strategy to check. Defaults to caller.
        // @return The quantity of tokens available for the Strategy to draw on.

        return _creditAvailable();
    }

    function _debtOutstanding() internal view returns (uint256) {
        // See note on `debtOutstanding()`.
        if (debtRatio == 0) {
            return totalDebt;
        }

        uint256 debtLimit = ((debtRatio * totalUnderlyingAssets()) / MAX_BPS);

        if (totalDebt <= debtLimit) return 0;
        else return totalDebt - debtLimit;
    }

    function debtOutstanding() external view returns (uint256) {
        // @notice
        //     Determines if `strategy` is past its debt limit and if any tokens
        //     should be withdrawn to the Vault.
        // @return The quantity of tokens to withdraw.

        return _debtOutstanding();
    }

    function updateEmergencyShutdownState(
        bool shutdownState_,
        bool detachStrategy
    ) external onlyOwner {
        if (shutdownState_ && detachStrategy) {
            // If we're exiting emergency shutdown, we need to empty strategy
            _withdrawAllFromStrategy();
            strategy = IStrategy(address(0));
        }
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
    }

    ////////////////////////////////////////////////////////
    ////////////////////// SETTERS //////////////////////////
    ////////////////////////////////////////////////////////

    function setDebtRatio(uint256 debtRatio_) external onlyOwner {
        if (debtRatio_ > MAX_BPS) revert DebtRatioTooHigh();
        debtRatio = debtRatio_;

        emit DebtRatioUpdated(debtRatio_);
    }

    function setStrategy(address strategy_) external onlyOwner {
        strategy = IStrategy(strategy_);
        emit StrategyUpdated(strategy_);
    }

    function setRebalanceDelay(uint128 rebalanceDelay_) external onlyOwner {
        rebalanceDelay = rebalanceDelay_;
        emit RebalanceDelayUpdated(rebalanceDelay_);
    }
}
