// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity >=0.8.0;

import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import "../../utils/RescueBase.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {PermitDeadlineExpired, InvalidSigner} from "../../common/Errors.sol";

abstract contract YieldTokenBase is RescueBase, ReentrancyGuard, IERC20 {
    using FixedPointMathLib for uint256;

    /*//////////////////////////////////////////////////////////////
                            METADATA STORAGE
    //////////////////////////////////////////////////////////////*/

    string public name;

    string public symbol;

    uint8 public immutable decimals;

    /*//////////////////////////////////////////////////////////////
                              ERC20 STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 internal _totalSupply;

    mapping(address => uint256) internal _balanceOf;

    mapping(address => mapping(address => uint256)) public allowance;

    /*//////////////////////////////////////////////////////////////
                            EIP-2612 STORAGE
    //////////////////////////////////////////////////////////////*/

    uint256 internal immutable INITIAL_CHAIN_ID;

    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    mapping(address => uint256) public nonces;

    /*//////////////////////////////////////////////////////////////
                            YIELD STORAGE
    //////////////////////////////////////////////////////////////*/

    // Timestamp of last rebalance
    uint256 public lastSyncTimestamp;

    // total yield from all siblings
    uint256 public totalUnderlyingAssets;

    /*//////////////////////////////////////////////////////////////
                               CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(string memory _name, string memory _symbol, uint8 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = _decimals;

        INITIAL_CHAIN_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();
    }

    /*//////////////////////////////////////////////////////////////
                               ERC20 LOGIC
    //////////////////////////////////////////////////////////////*/

    function convertToShares(
        uint256 underlyingAssets
    ) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return
            supply == 0
                ? underlyingAssets
                : underlyingAssets.mulDivDown(supply, totalUnderlyingAssets);
    }

    function convertToAssets(
        uint256 shares
    ) public view virtual returns (uint256) {
        uint256 supply = _totalSupply; // Saves an extra SLOAD if _totalSupply is non-zero.
        return
            supply == 0
                ? shares
                : shares.mulDivDown(totalUnderlyingAssets, supply);
    }

    function balanceOf(address user_) external view returns (uint256) {
        uint256 balance = _balanceOf[user_];
        if (balance == 0) return 0;
        return convertToAssets(balance);
    }

    // recheck for multi yield
    function totalSupply() external view returns (uint256) {
        if (_totalSupply == 0) return 0;
        return totalUnderlyingAssets;
    }

    function approve(
        address spender_,
        uint256 amount_
    ) public virtual returns (bool) {
        uint256 shares = convertToShares(amount_);
        allowance[msg.sender][spender_] = shares;

        emit Approval(msg.sender, spender_, shares);

        return true;
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

    // transfer changes shares balance but reduces the amount
    function transferFrom(
        address from_,
        address to_,
        uint256 amount_
    ) public override returns (bool) {
        uint256 sharesToTransfer = convertToShares(amount_);

        uint256 allowed = allowance[from_][msg.sender]; // Saves gas for limited approvals.

        if (allowed != type(uint256).max)
            allowance[from_][msg.sender] = allowed - sharesToTransfer;

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
                             EIP-2612 LOGIC
    //////////////////////////////////////////////////////////////*/

    function permit(
        address owner,
        address spender,
        uint256 value,
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public virtual {
        if (deadline < block.timestamp) revert PermitDeadlineExpired();
        // Unchecked because the only math done is incrementing
        // the owner's nonce which cannot realistically overflow.
        unchecked {
            address recoveredAddress = ecrecover(
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        DOMAIN_SEPARATOR(),
                        keccak256(
                            abi.encode(
                                keccak256(
                                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                                ),
                                owner,
                                spender,
                                convertToShares(value),
                                nonces[owner]++,
                                deadline
                            )
                        )
                    )
                ),
                v,
                r,
                s
            );

            if (recoveredAddress == address(0) || recoveredAddress != owner)
                revert InvalidSigner();

            allowance[recoveredAddress][spender] = value;
        }

        emit Approval(owner, spender, value);
    }

    function DOMAIN_SEPARATOR() public view virtual returns (bytes32) {
        return
            block.chainid == INITIAL_CHAIN_ID
                ? INITIAL_DOMAIN_SEPARATOR
                : computeDomainSeparator();
    }

    function computeDomainSeparator() internal view virtual returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    keccak256(
                        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                    ),
                    keccak256(bytes(name)),
                    keccak256("1"),
                    block.chainid,
                    address(this)
                )
            );
    }

    /*//////////////////////////////////////////////////////////////
                        INTERNAL MINT/BURN LOGIC
    //////////////////////////////////////////////////////////////*/

    function _mint(address to, uint256 amount) internal virtual {
        _totalSupply += amount;

        // Cannot overflow because the sum of all user
        // balances can't exceed the max uint256 value.
        unchecked {
            _balanceOf[to] += amount;
        }

        emit Transfer(address(0), to, amount);
    }

    function _burn(address from, uint256 amount) internal virtual {
        _balanceOf[from] -= amount;

        // Cannot underflow because a user's balance
        // will never be larger than the total supply.
        unchecked {
            _totalSupply -= amount;
        }

        emit Transfer(from, address(0), amount);
    }
}
