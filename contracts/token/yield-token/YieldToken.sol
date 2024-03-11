// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "./YieldTokenBase.sol";
import {IStrategy} from "../../interfaces/IStrategy.sol";
import {IConnector} from "../../interfaces/IConnector.sol";
import {IHook} from "../../interfaces/IHook.sol";

// add shutdown
contract YieldToken is YieldTokenBase {
    using FixedPointMathLib for uint256;

    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 constant HOOK_ROLE = keccak256("HOOK_ROLE");

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) YieldTokenBase(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    // move to hook
    // fix to round up and check other cases
    function calculateMintAmount(
        uint256 underlyingAssets_
    ) external view returns (uint256) {
        // total supply -> total shares
        // total yield -> total underlying from all chains
        // yield sent from src chain includes new amount hence subtracted here
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return
            supply == 0
                ? underlyingAssets_
                : underlyingAssets_.mulDivUp(supply, totalUnderlyingAssets);
    }

    function burn(
        address user_,
        uint256 shares_
    ) external nonReentrant onlyRole(MINTER_ROLE) {
        _burn(user_, shares_);
    }

    // minter role
    function mint(
        address receiver_,
        uint256 amount_
    ) external nonReentrant onlyRole(MINTER_ROLE) {
        _mint(receiver_, amount_);
    }

    // hook role
    function updateTotalUnderlyingAssets(
        uint256 amount_
    ) external onlyRole(HOOK_ROLE) {
        _updateTotalUnderlyingAssets(amount_);
    }

    function _updateTotalUnderlyingAssets(uint256 amount_) internal {
        lastSyncTimestamp = block.timestamp;
        totalUnderlyingAssets = amount_;
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
}
