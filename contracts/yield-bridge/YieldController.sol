// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import {IStrategy} from "./interfaces/IStrategy.sol";
import "../libraries/RescueFundsLib.sol";
import {IConnector, IHub} from "../superbridge/ConnectorPlug.sol";
import "./LimitController.sol";

contract YieldController is LimitController, ReentrancyGuard {
    using SafeTransferLib for ERC20;

    ERC20 public immutable token__;
    uint128 public lastSyncTimestamp; // Timstamp of last rebalance

    uint256 public totalMinted;
    uint256 public rewardsPerShare;

    error ZeroAmount();

    constructor(address token_) AccessControl(msg.sender) {
        token__ = ERC20(token_);
    }

    /// @notice Returns the total quantity of all assets under control of this
    ///    Vault, whether they're loaned out to a Strategy, or currently held in
    /// the Vault.
    /// @dev Explain to a developer any extra details
    /// @return total quantity of all assets under control of this
    ///    Vault
    function balanceOf(address user_) external view override returns (uint256) {
        uint256 balance = token.balanceOf(user_);
        return balance * rewardsPerShare + balance;
    }

    function withdraw(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant notShutdown returns (uint256 deposited) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ == 0) revert ZeroAmount();

        // rename
        _depositLimitHook(amount_, connector_);

        token.burn(receiver_, amount_);
        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(receiver_, amount_)
        );
    }

    function syncFromVaults(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) internal {
        lastSyncTimestamp = block.timestamp;
        rewardsPerShare = totalMinted / totalYield;
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
        (
            address receiver,
            uint256 unlockAmount,
            uint256 totalYield
        ) = _beforeMint(payload_);

        syncFromVaults(siblingChainSlug_, totalYield);
        if (receiver != address(0))
            return _mint(receiver, receiver, unlockAmount);
    }

    function mintPending(
        address receiver_,
        address connector_
    ) external nonReentrant notShutdown returns (uint256) {
        uint256 mintAmount = _withdrawLimitHook(
            receiver_,
            pendingInbound[msg.sender][receiver_]
        );
        return _mint(receiver_, mintAmount);
    }

    // receive inbound assuming connector called
    function _beforeMint(
        bytes memory payload_
    )
        internal
        returns (address receiver, uint256 unlockAmount, uint256 totalYield)
    {
        (receiver, unlockAmount, totalYield) = abi.decode(
            payload_,
            (address, uint256, uint256)
        );
        if (receiver != address(0))
            unlockAmount = _withdrawLimitHook(receiver, unlockAmount);
    }

    function _mint(
        address receiver_,
        uint256 amount_
    ) internal returns (uint256) {
        if (receiver_ == address(0)) revert ZeroAddress();
        token.mint(receiver_, amount_);
    }

    function maxAvailableShares() public view returns (uint256) {
        return convertToShares(_totalAssets());
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
