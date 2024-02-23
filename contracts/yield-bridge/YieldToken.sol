// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import "./erc4626/ERC4626.sol";
import {IStrategy} from "./interfaces/IStrategy.sol";
import {IConnector} from "../superbridge/ConnectorPlug.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import "./LimitController.sol";

// add shutdown
contract YieldToken is ERC4626, LimitController, ReentrancyGuard {
    // connector => timestamp
    mapping(address => uint128) public lastSyncTimestamp; // Timestamp of last rebalance
    // connector => total yield
    mapping(address => uint256) public siblingTotalYield;
    // total yield from all siblings
    uint256 public totalYield;

    error InsufficientFunds();
    error ZeroAmount();
    error ZeroAddress();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) Token(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    function balanceOf(address user_) external view override returns (uint256) {
        uint256 balance = _balanceOf[user_];
        if (balance == 0) return 0;
        return _calculateBalanceWithYield(balance);
    }

    function _calculateBalanceWithYield(
        uint256 balance_
    ) internal view returns (uint256) {
        return (balance_ * totalYield) / totalSupply;
    }

    function _calculateMintAmount(
        uint256 amount_
    ) internal view returns (uint256) {
        if (totalSupply == 0) return amount_;
        // yield sent from src chain includes new amount hence subtracted here
        return (amount_ * totalSupply) / (totalYield - amount_);
    }

    function _calculateBurnAmount(
        uint256 amount_
    ) internal view returns (uint256) {
        return (amount_ * totalSupply) / totalYield;
    }

    function withdraw(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable nonReentrant returns (uint256 deposited) {
        if (receiver_ == address(0)) revert ZeroAddress();
        if (amount_ == 0) revert ZeroAmount();
        if (amount_ > siblingTotalYield[connector_]) revert InsufficientFunds();

        uint256 sharesToBurn = _calculateBurnAmount(amount_);
        totalYield -= amount_;
        siblingTotalYield[connector_] -= amount_;

        _checkLimitAndRevert(sharesToBurn, connector_);
        super.withdraw(msg.sender, sharesToBurn);

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

    // receive inbound assuming connector called
    //  todo: validate msg.sender
    function receiveInbound(
        bytes memory payload_
    ) public nonReentrant returns (uint256 amount) {
        (address receiver, uint256 mintAmount, uint256 newYield) = abi.decode(
            payload_,
            (address, uint256, uint256)
        );

        lastSyncTimestamp[msg.sender] = uint128(block.timestamp);
        totalYield = totalYield + newYield - siblingTotalYield[msg.sender];
        siblingTotalYield[msg.sender] = newYield;

        if (receiver != address(0)) {
            amount = _calculateMintAmount(mintAmount);
            amount = _checkLimitAndQueue(receiver, amount);
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
        _mint(receiver_, amount);
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
