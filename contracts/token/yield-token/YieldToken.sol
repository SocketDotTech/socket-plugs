// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "./YieldTokenBase.sol";
import {IStrategy} from "../../interfaces/IStrategy.sol";
import {IConnector} from "../../interfaces/IConnector.sol";
import {IHook} from "../../interfaces/IHook.sol";

// add shutdown
contract YieldToken is YieldTokenBase {
    bytes32 constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

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

    // fix to round up and check other cases
    function _calculateMintAmount(
        uint256 assets_
    ) internal view returns (uint256) {
        // total supply -> total shares
        // total yield -> total underlying from all chains
        // yield sent from src chain includes new amount hence subtracted here
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return
            supply == 0
                ? assets_
                : assets_.mulDivUp(supply, (totalYield - amount_));
    }

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
        _setYield(totalYield - amount_);
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
        _setYield(amount_);
    }

    function _setYield(uint256 amount_) internal onlyRole(CONTROLLER_ROLE) {
        lastSyncTimestamp = block.timestamp;
        totalYield = amount_;
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
