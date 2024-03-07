// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import "./YieldTokenBase.sol";
import {IStrategy} from "../../interfaces/IStrategy.sol";
import {IConnector} from "../interfaces/IConnector.sol";
import {IHook} from "../interfaces/IHook.sol";
import "../utils/RescueBase.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";

// add shutdown
contract YieldToken is YieldTokenBase, ReentrancyGuard, RescueBase {
    using FixedPointMathLib for uint256;

    // connector => timestamp
    mapping(address => uint128) public lastSyncTimestamp; // Timestamp of last rebalance
    // connector => total yield
    mapping(address => uint256) public siblingTotalYield;
    // total yield from all siblings
    uint256 public totalYield;

    error InsufficientFunds();
    error ZeroAmount();
    error ZeroAddressReceiver();
    error NoPendingData();
    error CannotTransferOrExecuteOnBridgeContracts();

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) YieldTokenBase(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    function convertToShares(
        uint256 assets
    ) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return supply == 0 ? assets : assets.mulDivDown(supply, totalAssets());
    }

    function convertToAssets(
        uint256 shares
    ) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return supply == 0 ? shares : shares.mulDivDown(totalAssets(), supply);
    }

    function balanceOf(address user_) external view returns (uint256) {
        uint256 balance = _balanceOf[user_];
        if (balance == 0) return 0;
        return convertToAssets(balance);
    }

    // recheck for multi yield
    function totalSupply() external view returns (uint256) {
        if (_totalSupply == 0) return 0;
        return totalYield;
    }

    // fix to round up and check other cases
    function _calculateMintAmount(
        uint256 amount_
    ) internal view returns (uint256) {
        if (_totalSupply == 0) return amount_;
        // total supply -> total shares
        // total yield -> total underlying from all chains
        // yield sent from src chain includes new amount hence subtracted here
        return (amount_ * _totalSupply) / (totalYield - amount_);
    }

    //  todo: validate msg.sender
    function burn(
        address receiver_,
        uint256 amount_,
        address connector_
    ) external payable nonReentrant returns (uint256 deposited) {
        if (amount_ > siblingTotalYield[connector_]) revert InsufficientFunds();
        uint256 sharesToBurn = convertToShares(amount_);
        _burn(msg.sender, sharesToBurn);
    }

    function updateYield() external {
        // todo: only controller can call
        totalYield -= amount_;
        siblingTotalYield[connector_] -= amount_;
    }

    // receive inbound assuming connector called
    //  todo: validate msg.sender
    function receiveInbound(
        bytes memory payload_
    ) public nonReentrant returns (uint256 amount) {
        (uint256 newYield, ) = abi.decode(extraData, (uint256, bytes));

        lastSyncTimestamp[msg.sender] = uint128(block.timestamp);
        totalYield = totalYield + newYield - siblingTotalYield[msg.sender];
        siblingTotalYield[msg.sender] = newYield;

        if (receiver == address(0)) return 0;

        address finalReceiver = receiver;
        uint256 finalAmount = _calculateMintAmount(mintAmount);
        bytes memory postHookData = new bytes(0);

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, postHookData) = hook__.dstPreHookCall(
                receiver,
                finalAmount,
                IConnector(msg.sender).siblingChainSlug(),
                msg.sender,
                extraData,
                connectorCache[msg.sender]
            );
        }
        _mint(receiver, finalAmount);

        // todo: check post hook
    }

    function retry(
        address connector_,
        bytes32 identifier_
    ) external nonReentrant {
        bytes memory idCache = identifierCache[identifier_];
        bytes memory connCache = connectorCache[connector_];

        if (idCache.length == 0) revert NoPendingData();
        (
            address receiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        ) = hook__.preRetryHook(
                IConnector(msg.sender).siblingChainSlug(),
                connector_,
                idCache,
                connCache
            );

        // totalMinted += consumedAmount;
        _mint(receiver, consumedAmount);

        (
            bytes memory newIdentifierCache,
            bytes memory newConnectorCache
        ) = hook__.postRetryHook(
                IConnector(msg.sender).siblingChainSlug(),
                connector_,
                idCache,
                connCache,
                postRetryHookData
            );
        identifierCache[identifier_] = newIdentifierCache;
        connectorCache[connector_] = newConnectorCache;

        // emit PendingTokensBridged(
        //     siblingChainSlug_,
        //     receiver,
        //     consumedAmount,
        //     identifier
        // );
    }

    function transfer(
        address to_,
        uint256 amount_
    ) public override returns (bool) {
        uint256 sharesToTransfer = convertToShares(amount_);
        _balanceOf[msg.sender] -= sharesToTransfer;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            _balanceOf[to_] += sharesToTransfer;
        }

        emit Transfer(msg.sender, to_, amount_);

        return true;
    }

    function transferFrom(
        address from_,
        address to_,
        uint256 amount_
    ) public override returns (bool) {
        uint256 allowed = allowance[from_][msg.sender]; // Saves gas for limited approvals.

        if (allowed != type(uint256).max)
            allowance[from_][msg.sender] = allowed - amount_;

        uint256 sharesToTransfer = convertToShares(amount_);
        _balanceOf[from_] -= sharesToTransfer;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            _balanceOf[to_] += sharesToTransfer;
        }

        emit Transfer(from_, to_, amount_);

        return true;
    }

    /*//////////////////////////////////////////////////////////////
                     DEPOSIT/WITHDRAWAL LIMIT LOGIC
    //////////////////////////////////////////////////////////////*/

    function maxWithdraw(address owner) public view virtual returns (uint256) {
        return convertToAssets(convertToAssets(_balanceOf[owner]));
    }

    function maxRedeem(address owner) public view virtual returns (uint256) {
        return convertToAssets(_balanceOf[owner]);
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }
}
