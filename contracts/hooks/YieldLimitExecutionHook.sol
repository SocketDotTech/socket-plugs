// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import "solmate/tokens/ERC20.sol";

import "solmate/utils/SafeTransferLib.sol";
import {IConnector} from "../ConnectorPlug.sol";

import "./LimitExecutionHook.sol";

contract YieldLimitExecutionHook is LimitExecutionHook {
    using SafeTransferLib for ERC20;
    using FixedPointMathLib for uint256;

    uint256 public constant MAX_BPS = 10_000;

    IStrategy public strategy; // address of the strategy contract
    ERC20 public immutable asset__;

    uint256 public totalLockedInStrategy; // total funds deposited in strategy

    uint256 public totalIdle; // Amount of tokens that are in the vault
    uint256 public totalDebt; // Amount of tokens that strategy have borrowed
    uint128 public lastRebalanceTimestamp; // Timestamp of last rebalance

    uint128 public rebalanceDelay; // Delay between rebalance
    uint256 public debtRatio; // Debt ratio for the Vault (in BPS, <= 10k)
    bool public emergencyShutdown; // if true, no funds can be invested in the strategy

    event WithdrawFromStrategy(uint256 withdrawn);
    event Rebalanced(
        uint256 totalIdle,
        uint256 totalDebt,
        uint256 credit,
        uint256 debtOutstanding
    );
    event ShutdownStateUpdated(bool shutdownState);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(
        uint256 debtRatio_,
        uint128 rebalanceDelay_,
        address strategy_,
        address asset_,
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
        asset__ = ERC20(asset_);
        debtRatio = debtRatio_;
        rebalanceDelay = rebalanceDelay_;
        strategy = IStrategy(strategy_);
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
        notShutdown
        isVaultOrToken
        returns (TransferInfo memory transferInfo)
    {
        _checkDelayAndRebalance();
        uint256 expectedReturn = strategy.estimatedTotalAssets() + totalIdle;

        transferInfo = srcPostHookCallParams_.transferInfo;
        if (srcPostHookCallParams_.transferInfo.amount == 0) {
            transferInfo.data = abi.encode(expectedReturn, bytes(""));
        } else {
            transferInfo.data = abi.encode(
                expectedReturn,
                srcPostHookCallParams_.transferInfo.data
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

        // ensure vault have enough idle assets
        if (transferInfo.amount > totalAssets()) revert NotEnoughAssets();
        (bool pullFromStrategy, bytes memory payload_) = abi.decode(
            params_.transferInfo.data,
            (bool, bytes)
        );

        if (transferInfo.amount > totalIdle) {
            if (pullFromStrategy) {
                _withdrawFromStrategy(transferInfo.amount - totalIdle);
            } else {
                (, uint256 pendingAmount) = abi.decode(
                    postHookData,
                    (uint256, uint256)
                );
                pendingAmount += totalIdle - transferInfo.amount;
                postHookData = abi.encode(transferInfo.amount, pendingAmount);
                transferInfo.amount = totalIdle;
            }
            totalIdle = 0;
        } else totalIdle -= transferInfo.amount;

        transferInfo.data = payload_;
        transferInfo.receiver = params_.transferInfo.receiver;
    }

    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) public override notShutdown returns (CacheData memory cacheData) {
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
        isVaultOrToken
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (postRetryHookData, transferInfo) = super.preRetryHook(params_);
        if (transferInfo.amount > totalIdle) {
            _withdrawFromStrategy(transferInfo.amount - totalIdle);
            totalIdle = 0;
        } else totalIdle -= transferInfo.amount;
    }

    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) public override notShutdown returns (CacheData memory cacheData) {
        return super.postRetryHook(params_);
    }

    function withdrawFromStrategy(
        uint256 assets_
    ) external onlyOwner returns (uint256) {
        return _withdrawFromStrategy(assets_);
    }

    function _withdrawFromStrategy(
        uint256 assets_
    ) internal returns (uint256 withdrawn) {
        uint256 preBalance = asset__.balanceOf(address(this));
        strategy.withdraw(assets_);
        withdrawn = asset__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt -= withdrawn;

        asset__.transfer(controller, withdrawn);
        emit WithdrawFromStrategy(withdrawn);
    }

    function _withdrawAllFromStrategy() internal returns (uint256) {
        uint256 preBalance = asset__.balanceOf(address(this));
        strategy.withdrawAll();
        uint256 withdrawn = asset__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt = 0;

        asset__.transfer(controller, withdrawn);
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }

    function maxAvailableShares() public view returns (uint256) {
        return totalAssets();
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
            asset__.safeTransferFrom(controller, address(strategy), credit);
            strategy.invest();
        } else if (pendingDebt > 0) {
            // Credit deficit, take from Strategy
            _withdrawFromStrategy(pendingDebt);
        }

        emit Rebalanced(totalIdle, totalDebt, credit, pendingDebt);
    }

    /// @notice Returns the total quantity of all assets under control of this
    ///    Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @return total quantity of all assets under control of this Vault
    function totalAssets() public view returns (uint256) {
        return strategy.estimatedTotalAssets() + totalIdle;
    }

    function _creditAvailable() internal view returns (uint256) {
        uint256 vaultTotalAssets = totalAssets();
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

        uint256 debtLimit = ((debtRatio * totalAssets()) / MAX_BPS);

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

    // todo: add events
    function setDebtRatio(uint256 debtRatio_) external onlyOwner {
        if (debtRatio_ > MAX_BPS) revert DebtRatioTooHigh();
        debtRatio = debtRatio_;
    }

    function setStrategy(address strategy_) external onlyOwner {
        strategy = IStrategy(strategy_);
    }

    function setRebalanceDelay(uint128 rebalanceDelay_) external onlyOwner {
        rebalanceDelay = rebalanceDelay_;
    }
}
