// SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";

import "./erc4626/ERC4626.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import {IHook} from "../interfaces/IHook.sol";

import {IConnector} from "../superbridge/ConnectorPlug.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import {AccessControl} from "../common/AccessControl.sol";

// add shutdown
contract YieldToken is ERC4626, ReentrancyGuard, AccessControl {
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
    ) Token(name_, symbol_, decimals_) AccessControl(msg.sender) {}

    function balanceOf(address user_) external view override returns (uint256) {
        uint256 balance = _balanceOf[user_];
        if (balance == 0) return 0;
        return convertToAssets(balance);
    }

    // recheck for multi yield
    function totalSupply() external view override returns (uint256) {
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

        totalYield -= amount_;
        siblingTotalYield[connector_] -= amount_;
        super.withdraw(msg.sender, sharesToBurn);
    }

    // receive inbound assuming connector called
    //  todo: validate msg.sender
    function receiveInbound(
        bytes memory payload_
    ) public nonReentrant returns (uint256 amount) {
        (
            address receiver,
            uint256 mintAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (uint256 newYield, ) = abi.decode(extraData, (uint256, bytes));

        if (
            receiver == address(this)
            // ||
            // receiver == address()
            // receiver == address(token__)
        ) revert CannotTransferOrExecuteOnBridgeContracts();

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
