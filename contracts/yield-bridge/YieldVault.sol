// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "solmate/mixins/ERC4626.sol";
import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import {IStrategy} from "./interfaces/IStrategy.sol";
import "../libraries/RescueFundsLib.sol";
import {IConnector, IHub} from "../superbridge/ConnectorPlug.sol";
import "./LimitController.sol";

contract YieldVault is ERC4626, LimitController, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    ERC20 public immutable token__;
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
    error InvestingAboveThreshold();
    error NotEnoughAssets();
    error VaultShutdown();

    event TokensDeposited(address depositor, uint256 depositAmount);
    event TokensInvested(uint256 amount);
    event TokensHarvested(uint256 amount);
    event TokensWithdrawn(
        address depositor,
        address receiver,
        uint256 depositAmount
    );
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
        address token_,
        string memory name_,
        string memory symbol_
    ) ERC4626(ERC20(token_), name_, symbol_) AccessControl(msg.sender) {
        token__ = ERC20(token_);
    }

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
    /// @dev Explain to a developer any extra details
    /// @return total quantity of all assets under control of this
    ///    Vault
    function totalAssets() public view override returns (uint256) {
        return _totalAssets();
    }

    function _totalAssets() internal view returns (uint256) {
        return totalIdle + totalDebt;
    }

    function deposit(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown returns (uint256 deposited) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ == 0) revert ZeroAmount();

        totalIdle += amount_;

        _checkDelayAndRebalance();
        _depositLimitHook(amount_, connector_);
        uint256 expectedReturn = strategy.estimatedTotalAssets();

        deposited = super.deposit(amount_, receiver_);
        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(receiver_, amount_, expectedReturn)
        );
    }

    function syncToAppChain(
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown {
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
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) public nonReentrant notShutdown returns (uint256 amount) {
        (address receiver, uint256 unlockAmount) = _beforeWithdraw(payload_);
        return _withdraw(receiver, receiver, unlockAmount);
    }

    function withdrawPending(
        address receiver_,
        address connector_
    ) external nonReentrant notShutdown returns (uint256) {
        uint256 unlockAmount = _withdrawLimitHook(
            receiver_,
            pendingInbound[msg.sender][receiver_]
        );
        return _withdraw(receiver_, receiver_, unlockAmount);
    }

    // receive inbound assuming connector called
    function _beforeWithdraw(
        bytes memory payload_
    ) internal returns (address receiver, uint256 unlockAmount) {
        (receiver, unlockAmount) = abi.decode(payload_, (address, uint256));
        unlockAmount = _withdrawLimitHook(receiver, unlockAmount);
    }

    function _withdraw(
        address receiver_,
        address owner_,
        uint256 amount_
    ) internal returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ > totalIdle) revert NotEnoughAssets();

        totalIdle -= amount_;
        _checkDelayAndRebalance();
        return super.withdraw(amount_, receiver_, owner_);
    }

    function withdrawFromStrategy(
        uint256 assets_
    ) external onlyOwner returns (uint256) {
        _withdrawFromStrategy(assets_);
    }

    function _withdrawFromStrategy(uint256 assets_) internal returns (uint256) {
        uint256 preBalance = token__.balanceOf(address(this));
        strategy.withdraw(assets_);
        uint256 withdrawn = token__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt -= withdrawn;
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }

    function _withdrawAllFromStrategy() internal returns (uint256) {
        uint256 preBalance = token__.balanceOf(address(this));
        strategy.withdrawAll();
        uint256 withdrawn = token__.balanceOf(address(this)) - preBalance;
        totalIdle += withdrawn;
        totalDebt = 0;
        emit WithdrawFromStrategy(withdrawn);
        return withdrawn;
    }

    function maxAvailableShares() public view returns (uint256) {
        return convertToShares(_totalAssets());
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
            token__.safeTransfer(address(strategy), credit);
            strategy.invest();
        } else if (pendingDebt > 0) {
            // Credit deficit, take from Strategy
            _withdrawFromStrategy(pendingDebt);
        }

        emit Rebalanced(totalIdle, totalDebt, credit, pendingDebt);
    }

    function _creditAvailable() internal view returns (uint256) {
        uint256 vaultTotalAssets = _totalAssets();
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

        uint256 debtLimit = ((debtRatio * _totalAssets()) / MAX_BPS);

        if (totalDebt <= debtLimit) return 0;
        else return totalDebt - debtLimit;
    }

    function debtOutstanding() external view returns (uint256) {
        // @notice
        //     Determines if `strategy` is past its debt limit and if any tokens
        //     should be withdrawn to the Vault.
        // @param strategy The Strategy to check. Defaults to the caller.
        // @return The quantity of tokens to withdraw.

        return _debtOutstanding();
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
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
