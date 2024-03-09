// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import "solmate/tokens/ERC20.sol";

import "solmate/utils/SafeTransferLib.sol";
import {IConnector} from "../ConnectorPlug.sol";

import "./plugins/LimitPlugin.sol";
import "./plugins/ExecutionHelper.sol";

contract YieldLimitExecutionHook is LimitPlugin, ExecutionHelper {
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
        address controller_
    ) HookBase(msg.sender, controller_) {
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
    ) external isVaultOrToken returns (TransferInfo memory, bytes memory) {
        _limitSrcHook(params_.connector, params_.transferInfo.amount);
        totalIdle += params_.transferInfo.amount;
        return (params_.transferInfo, bytes(""));
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory srcPostHookCallParams_
    ) external returns (TransferInfo memory transferInfo) {
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
        external
        isVaultOrToken
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );

        // ensure vault have enough idle assets
        if (consumedAmount > totalAssets()) revert NotEnoughAssets();

        (bool pullFromStrategy, bytes memory payload_) = abi.decode(
            params_.transferInfo.data,
            (bool, bytes)
        );

        if (consumedAmount > totalIdle) {
            if (pullFromStrategy) {
                _withdrawFromStrategy(consumedAmount - totalIdle);
            } else {
                pendingAmount += totalIdle - consumedAmount;
                consumedAmount = totalIdle;
            }
            totalIdle = 0;
        } else totalIdle -= consumedAmount;

        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo.amount = consumedAmount;
        transferInfo.data = payload_;
        transferInfo.receiver = params_.transferInfo.receiver;
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     */
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) external isVaultOrToken returns (CacheData memory cacheData) {
        bytes memory execPayload = params_.transferInfo.data;
        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            params_.postHookData,
            (uint256, uint256)
        );

        uint256 connectorPendingAmount = abi.decode(
            params_.connectorCache,
            (uint256)
        );

        if (pendingAmount > 0) {
            cacheData.connectorCache = abi.encode(
                connectorPendingAmount + pendingAmount
            );
            // if pending amount is more than 0, payload is cached
            if (execPayload.length > 0) {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector,
                    execPayload
                );
            } else {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector,
                    bytes("")
                );
            }

            // emit TokensPending(
            //     siblingChainSlug_,
            //     receiver_,
            //     pendingAmount,
            //     pendingMints[siblingChainSlug_][receiver_][identifier],
            //     identifier
            // );
        } else if (execPayload.length > 0) {
            // execute
            bool success = _execute(params_.transferInfo.receiver, execPayload);

            if (success) cacheData.identifierCache = new bytes(0);
            else {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    0,
                    params_.connector,
                    execPayload
                );
            }

            cacheData.connectorCache = params_.connectorCache;
        }
    }

    /**
     * @notice Handles pre-retry hook logic before execution.
     * @dev This function can be used to mint funds which were in a pending state due to limits.
     */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        external
        isVaultOrToken
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (
            address receiver,
            uint256 pendingMint,
            address connector,
            bytes memory execPayload
        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );
        if (connector != params_.connector) revert InvalidConnector();

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            pendingMint
        );

        if (consumedAmount > totalIdle) {
            _withdrawFromStrategy(consumedAmount - totalIdle);
            totalIdle = 0;
        } else totalIdle -= consumedAmount;

        postRetryHookData = abi.encode(receiver, consumedAmount, pendingAmount);
        transferInfo = TransferInfo(receiver, consumedAmount, bytes(""));
    }

    /**
     * @notice Handles post-retry hook logic after execution.
     * @dev This function updates the identifier cache and sibling chain cache based on the post-hook data.
     */
    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) external isVaultOrToken returns (CacheData memory cacheData) {
        (
            ,
            uint256 pendingMint,
            address connector,
            bytes memory execPayload
        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );

        (address receiver, uint256 consumedAmount, uint256 pendingAmount) = abi
            .decode(params_.postRetryHookData, (address, uint256, uint256));

        if (pendingAmount == 0 && receiver != address(0)) {
            // receiver is not an input from user, can skip this check
            // if (receiver_ != receiver) revert InvalidReceiver();

            // no siblingChainSlug required here, as already done in preRetryHook call in same tx
            // if (siblingChainSlug != siblingChainSlug_)
            //     revert InvalidSiblingChainSlug();

            // execute
            bool success = _execute(receiver, execPayload);
            if (success) cacheData.identifierCache = new bytes(0);
            else
                cacheData.identifierCache = abi.encode(
                    receiver,
                    0,
                    connector,
                    execPayload
                );
        }
        uint256 connectorPendingAmount = abi.decode(
            params_.cacheData.connectorCache,
            (uint256)
        );

        cacheData.connectorCache = abi.encode(
            connectorPendingAmount - consumedAmount
        );
    }

    // todo: should this be moved out?
    function syncToAppChain(
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown {
        _checkDelayAndRebalance();
        uint256 expectedReturn = strategy.estimatedTotalAssets();

        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(address(0), 0, expectedReturn),
            bytes("")
        );
    }

    function _depositToAppChain(
        uint256 msgGasLimit_,
        address connector_,
        bytes memory payload_,
        bytes memory options_
    ) internal {
        IConnector(connector_).outbound{value: msg.value}(
            msgGasLimit_,
            payload_,
            options_
        );
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
