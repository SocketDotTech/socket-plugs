pragma solidity 0.8.13;

import "./ERC20.sol";
import "../../common/AccessControl.sol";

contract Token is ERC20, AccessControl {
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 constant BURNER_ROLE = keccak256("BURNER_ROLE");

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    function balanceOf(
        address user
    ) external view virtual returns (uint256 balance) {
        return _balanceOf[user];
    }

    function _mint(
        address to,
        uint256 amount
    ) internal override onlyRole(MINTER_ROLE) {
        // if (to == address(0)) revert ZeroAddress();
        super._mint(to, amount);
    }

    function _burn(
        address from,
        uint256 amount
    ) internal override onlyRole(BURNER_ROLE) {
        // if (from == address(0)) revert ZeroAddress();
        super._burn(from, amount);
    }
}
