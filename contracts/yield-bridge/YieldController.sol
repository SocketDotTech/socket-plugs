// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import "./erc4626/ERC4626.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";
import {IConnector} from "../superbridge/ConnectorPlug.sol";

import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import "./LimitController.sol";

// add shutdown
contract YieldController is ERC4626, LimitController, ReentrancyGuard {
    uint128 public lastSyncTimestamp; // Timestamp of last rebalance
    uint256 public rewardsPerShare;

    error ZeroAmount();
    error ZeroAddress();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) Token(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    function balanceOf(address user_) external view override returns (uint256) {
        uint256 balance = _balanceOf[user_];
        return _calculateBalanceWithYield(balance);
    }

    function _calculateBalanceWithYield(
        uint256 balance_
    ) internal view returns (uint256) {
        return balance_ * rewardsPerShare + balance_;
    }

    function withdraw(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant returns (uint256 deposited) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ == 0) revert ZeroAmount();

        _checkLimitAndRevert(amount_, connector_);
        super.withdraw(receiver_, amount_);
        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(receiver_, amount_)
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
    ) public nonReentrant returns (uint256 amount) {
        (
            address receiver,
            uint256 unlockAmount,
            uint256 totalYield
        ) = _beforeMint(payload_);

        syncFromVaults(siblingChainSlug_, totalYield);
        if (receiver != address(0)) {
            amount = _calculateBalanceWithYield(unlockAmount);
            _mint(receiver, amount);
        }
    }

    function mintPending(
        address receiver_,
        address connector_
    ) external nonReentrant returns (uint256 amount) {
        uint256 mintAmount = _checkLimitAndQueue(
            receiver_,
            pendingMintAndUnlocks[msg.sender][receiver_]
        );

        amount = _calculateBalanceWithYield(mintAmount);
        _mint(receiver_, amount);
    }

    function syncFromVaults(uint32, uint256 totalYield_) internal {
        lastSyncTimestamp = uint128(block.timestamp);
        //validate logic: yield on yield
        rewardsPerShare = totalSupply / totalYield_;
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
            unlockAmount = _checkLimitAndQueue(receiver, unlockAmount);
    }

    /*//////////////////////////////////////////////////////////////
                     DEPOSIT/WITHDRAWAL LIMIT LOGIC
    //////////////////////////////////////////////////////////////*/

    function maxWithdraw(address owner) public view virtual returns (uint256) {
        return convertToAssets(_calculateBalanceWithYield(_balanceOf[owner]));
    }

    function maxRedeem(address owner) public view virtual returns (uint256) {
        return _calculateBalanceWithYield(_balanceOf[owner]);
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
