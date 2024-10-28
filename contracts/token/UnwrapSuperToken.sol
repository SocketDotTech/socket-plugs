// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../utils/RescueBase.sol";
import "../interfaces/IHook.sol";
import {ERC20} from "solmate/tokens/ERC20.sol";
import {SafeTransferLib} from "solmate/utils/SafeTransferLib.sol";

/**
 * @title UnwrapSupertoken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts. The contract is designed to be used as a wrapper for a native gas token and unwrap automatically once it arrives onto the destination chain.
 */
contract UnwrapSuperToken is ERC20, RescueBase {
    using SafeTransferLib for address;

    event Deposit(address indexed from, uint256 amount);
    event Withdrawal(address indexed to, uint256 amount);
    event WithdrawalFailed(address indexed to, uint256 amount);

    // for all controller access (mint, burn)
    bytes32 public constant CONTROLLER_ROLE = keccak256("CONTROLLER_ROLE");

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

    /// @notice Burns supertokens from a user's balance
    /// @dev Only callable by addresses with CONTROLLER_ROLE
    /// @param user_ Address to burn tokens from
    /// @param amount_ Amount of tokens to burn
    function burn(
        address user_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        require(user_ != address(0), "Invalid user address");
        require(amount_ > 0, "Amount must be greater than 0");
        require(balanceOf[user_] >= amount_, "Insufficient balance");

        _burn(user_, amount_);
    }

    //lock the NonMintable ERC20 token on the source chain and mint it on the child chain
    function mint(
        address receiver_,
        uint256 amount_
    ) external onlyRole(CONTROLLER_ROLE) {
        require(receiver_ != address(0), "Invalid receiver address");
        require(amount_ > 0, "Amount must be greater than 0");
        _mint(receiver_, amount_);
    }

    /// @notice Deposits native GHST and mints the corresponding supertoken
    /// @dev Mints supertokens 1:1 with deposited native GHST
    /// @dev The deposited GHST is held by this contract as backing for the supertokens
    function deposit(address to_) public payable {
        require(to_ != address(0), "Invalid receiver address");
        require(msg.value > 0, "Amount must be greater than 0");
        _mint(to_, msg.value);
        emit Deposit(to_, msg.value);
    }

    /// @notice Withdraws native GHST and burns the corresponding supertoken
    /// @dev Burns supertokens 1:1 and transfers the backing native GHST to the receiver
    /// @dev If contract has insufficient native GHST balance, emits WithdrawalFailed and returns
    /// @param amount_ Amount of GHST to withdraw
    /// @param to_ Address to receive the withdrawn GHST
    function withdraw(uint256 amount_, address to_) external {
        require(to_ != address(0), "Invalid receiver address");
        require(amount_ > 0, "Amount must be greater than 0");

        //perform a balance check to ensure the contract has enough to withdraw and not revert
        if (address(this).balance < amount_) {
            //silently fail with an event, so we don't break the bridging tx
            emit WithdrawalFailed(to_, amount_);
            return;
        } else {
            _burn(to_, amount_);
            to_.safeTransferETH(amount_);
            emit Withdrawal(to_, amount_);
        }
    }

    receive() external payable {
        deposit(msg.sender);
    }
}
