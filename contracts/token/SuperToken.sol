// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "../utils/RescueBase.sol";
import "../interfaces/IHook.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract SuperToken is ERC20, RescueBase {
    // for all controller access (mint, burn)
    bytes32 constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    /**
     * @notice constructor for creating a new SuperToken.
     * @param name_ token name
     * @param symbol_ token symbol
     * @param decimals_ token decimals (should be same on all chains)
     * @param initialSupplyHolder_ address to which initial supply will be minted
     * @param owner_ owner of this contract
     * @param initialSupply_ initial supply of super token
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialSupplyHolder_,
        address owner_,
        uint256 initialSupply_
    ) ERC20(name_, symbol_, decimals_) AccessControl(owner_) {
        _mint(initialSupplyHolder_, initialSupply_);
        _grantRole(RESCUE_ROLE, owner_);
    }

    function burn(
        address user_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        _burn(user_, amount_);
    }

    function mint(
        address receiver_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        _mint(receiver_, amount_);
    }
}
