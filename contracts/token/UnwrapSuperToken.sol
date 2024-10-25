// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../utils/RescueBase.sol";
import "../interfaces/IHook.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/utils/SafeTransferLib.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract UnwrapSuperToken is ERC20, RescueBase {
    using SafeTransferLib for address;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);

    // for all controller access (mint, burn)
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

    // bytes32 public constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

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

    //Controller Functions

    //burns the supertoken and and unlocks it on the parent chain chain
    function burn(
        address user_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        _burn(user_, amount_);
    }

    //lock the NonMintable ERC20 token on the source chain and mint it on the child chain
    function mint(
        address receiver_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        _mint(receiver_, amount_);
    }

    //Wrapping Functions

    //deposits native GHST and mints the supertoken
    function deposit() public payable {
        _mint(msg.sender, msg.value);
        emit Deposit(msg.sender, msg.value);
    }

    //withdraws native GHST and burns the supertoken
    function withdraw(uint256 amount_) external {
        _burn(msg.sender, amount_);
        msg.sender.safeTransferETH(amount_);
        emit Withdrawal(msg.sender, amount_);
    }

    receive() external payable {
        deposit();
    }
}

//So the flow is:
//1. User locks their GHST on Polygon, which triggers the mint function on Geist, minting the supertoken version of GHST.
//2. Next, we need to automatically unwrap the supertoken GHST into native GHST.
//3. To do this, we call the withdraw function. This burns the supertoken and sends the native GHST back to the user.
//4. But if there isn't enough native GHST in the contract, the withdraw will fail. So we need to deposit more native GHST to the contract.
