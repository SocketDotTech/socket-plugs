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

    bytes32 constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    // connector => timestamp
    mapping(address => uint128) public lastSyncTimestamp; // Timestamp of last rebalance
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
        uint8 decimals_,
        address controller_
    ) YieldTokenBase(name_, symbol_, decimals_) AccessControl(msg.sender) {
        _grantRole(CONTROLLER_ROLE, controller_);
    }

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
        address user_,
        uint256 amount_,
        address connector_
    )
        external
        payable
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        returns (uint256 sharesToBurn)
    {
        sharesToBurn = convertToShares(amount_);
        _burn(user_, sharesToBurn);
    }

    function mint(
        address receiver_,
        uint256 amount_
    )
        external
        payable
        nonReentrant
        onlyRole(CONTROLLER_ROLE)
        returns (uint256 sharesToMint)
    {
        sharesToMint = _calculateMintAmount(amount_);
        _mint(receiver_, sharesToMint);
    }

    function updateYield(uint256 amount_) external onlyRole(CONTROLLER_ROLE) {
        lastSyncTimestamp = block.timestamp;
        totalYield -= amount_;
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
