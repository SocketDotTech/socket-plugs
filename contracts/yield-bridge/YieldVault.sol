// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";

import {IStrategy} from "./interfaces/IStrategy.sol";
import "../libraries/RescueFundsLib.sol";
import {IConnector} from "../superbridge/ConnectorPlug.sol";
import "./LimitController.sol";

contract YieldVault is LimitController, ReentrancyGuard {
    using SafeTransferLib for ERC20;
    using FixedPointMathLib for uint256;

    ERC20 public immutable asset__;
    uint256 public constant MAX_BPS = 10_000;

    IStrategy public strategy; // address of the strategy contract

    uint256 public totalIdle; // Amount of tokens that are in the vault
    uint256 public totalDebt; // Amount of tokens that strategy have borrowed
    uint256 public debtRatio; // Debt ratio for the Vault (in BPS, <= 10k)
    uint128 public lastRebalanceTimestamp; // Timstamp of last rebalance
    uint128 public rebalanceDelay; // Delay between rebalances
    bool public emergencyShutdown; // if true, no funds can be invested in the strategy

    error ZeroAmount();
    error DebtRatioTooHigh();
    error NotEnoughAssets();
    error VaultShutdown();
    event WithdrawFromStrategy(uint256 withdrawn);
    event Rebalanced(
        uint256 totalIdle,
        uint256 totalDebt,
        uint256 credit,
        uint256 debtOutstanding
    );
    event ShutdownStateUpdated(bool shutdownState);

    // erc4626
    event Deposit(
        address indexed caller,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );
    event Withdraw(
        address indexed caller,
        address indexed receiver,
        address indexed owner,
        uint256 assets,
        uint256 shares
    );

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(address asset_) AccessControl(msg.sender) {
        asset__ = ERC20(asset_);
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

    /// @notice Returns the total quantity of all assets under control of this
    ///    Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @return total quantity of all assets under control of this Vault
    function totalAssets() public view returns (uint256) {
        return totalIdle + totalDebt;
    }

    function deposit(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ == 0) revert ZeroAmount();

        totalIdle += amount_;

        _checkDelayAndRebalance();
        _checkLimitAndRevert(amount_, connector_);
        uint256 expectedReturn = strategy.estimatedTotalAssets();

        asset__.safeTransferFrom(msg.sender, address(this), amount_);
        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(receiver_, amount_, expectedReturn)
        );

        emit Deposit(msg.sender, receiver_, amount_, amount_);
    }

    function syncToAppChain(
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown {
        _checkDelayAndRebalance();
        uint256 expectedReturn = strategy.estimatedTotalAssets();

        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(address(0), 0, expectedReturn)
        );
    }

    function _depositToAppChain(
        uint256 msgGasLimit_,
        address connector_,
        bytes memory payload
    ) internal {
        IConnector(connector_).outbound{value: msg.value}(
            msgGasLimit_,
            payload
        );
    }

    function receiveInbound(
        uint32,
        bytes memory payload_
    ) public nonReentrant notShutdown returns (uint256 unlockAmount) {
        address receiver;
        (receiver, unlockAmount) = _beforeWithdraw(payload_);
        _withdraw(receiver, receiver, unlockAmount);
    }

    function withdrawPending(
        address receiver_,
        address
    ) external nonReentrant notShutdown returns (uint256 unlockAmount) {
        unlockAmount = _checkLimitAndQueue(
            receiver_,
            pendingMintAndUnlocks[msg.sender][receiver_]
        );
        _withdraw(receiver_, receiver_, unlockAmount);
    }

    // receive inbound assuming connector called
    function _beforeWithdraw(
        bytes memory payload_
    ) internal returns (address receiver, uint256 unlockAmount) {
        (receiver, unlockAmount) = abi.decode(payload_, (address, uint256));
        unlockAmount = _checkLimitAndQueue(receiver, unlockAmount);
    }

    function _withdraw(address receiver_, address, uint256 amount_) internal {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ > totalIdle) revert NotEnoughAssets();

        totalIdle -= amount_;
        _checkDelayAndRebalance();
        asset__.safeTransfer(receiver_, amount_);

        emit Withdraw(msg.sender, receiver_, receiver_, amount_, amount_);
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
        emit WithdrawFromStrategy(withdrawn);
    }

    function _withdrawAllFromStrategy() internal returns (uint256) {
        uint256 preBalance = asset__.balanceOf(address(this));
        strategy.withdrawAll();
        uint256 withdrawn = asset__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt = 0;
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
            asset__.safeTransfer(address(strategy), credit);
            strategy.invest();
        } else if (pendingDebt > 0) {
            // Credit deficit, take from Strategy
            _withdrawFromStrategy(pendingDebt);
        }

        emit Rebalanced(totalIdle, totalDebt, credit, pendingDebt);
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

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
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

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
