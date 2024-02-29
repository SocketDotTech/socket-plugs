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
    IHook public hook__;

    // connector => timestamp
    mapping(address => uint128) public lastSyncTimestamp; // Timestamp of last rebalance
    // connector => total yield
    mapping(address => uint256) public siblingTotalYield;
    // total yield from all siblings
    uint256 public totalYield;

    // message identifier => cache
    mapping(bytes32 => bytes) public identifierCache;

    // sibling chain => cache
    mapping(address => bytes) public connectorCache;

    mapping(address => bool) public validConnectors;

    error InsufficientFunds();
    error ZeroAmount();
    error ZeroAddressReceiver();
    error NoPendingData();
    error CannotTransferOrExecuteOnBridgeContracts();

    event HookUpdated(address hook_);

    constructor(
        string memory name_,
        string memory symbol_,
        address hook_,
        uint8 decimals_
    ) Token(name_, symbol_, decimals_) AccessControl(msg.sender) {
        hook__ = IHook(hook_);
    }

    /**
     * @notice this function is used to update hook
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param hook_ new hook address
     */
    function updateHook(address hook_) external onlyOwner {
        hook__ = IHook(hook_);
        emit HookUpdated(hook_);
    }

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

    function _calculateMintAmount(
        uint256 amount_
    ) internal view returns (uint256) {
        if (_totalSupply == 0) return amount_;
        // yield sent from src chain includes new amount hence subtracted here
        return (amount_ * _totalSupply) / (totalYield - amount_);
    }

    function withdraw(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable nonReentrant returns (uint256 deposited) {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        if (amount_ == 0) revert ZeroAmount();
        if (amount_ > siblingTotalYield[connector_]) revert InsufficientFunds();

        uint256 sharesToBurn = convertToShares(amount_);
        totalYield -= amount_;
        siblingTotalYield[connector_] -= amount_;

        address finalReceiver = receiver_;
        uint256 finalAmount = sharesToBurn;
        bytes memory extraData = payload_;

        if (address(hook__) != address(0)) {
            (finalReceiver, finalAmount, extraData) = hook__.srcHookCall(
                receiver_,
                amount_,
                IConnector(connector_).siblingChainSlug(),
                connector_,
                msg.sender,
                payload_
            );
        }

        super.withdraw(msg.sender, finalAmount);

        _depositToAppChain(
            msgGasLimit_,
            connector_,
            abi.encode(receiver_, amount_)
        );
    }

    function _depositToAppChain(
        uint256 msgGasLimit_,
        address connector_,
        bytes memory payload
    ) internal {
        IConnector(connector_).outbound{value: msg.value}(
            msgGasLimit_,
            payload
        );
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
