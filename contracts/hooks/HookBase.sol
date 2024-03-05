pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import {AccessControl} from "../common/AccessControl.sol";
import {NotAuthorized, ZeroAddressReceiver} from "../common/errors.sol";
import "../interfaces/IHook.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
abstract contract HookBase is ReentrancyGuard, AccessControl, IHook {
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

    address public immutable vaultOrToken;

    /**
     * @notice Constructor for creating a new SuperToken.
     */
    constructor(address owner_, address vaultOrToken_) AccessControl(owner_) {
        vaultOrToken = vaultOrToken_;
    }

    modifier isVaultOrToken() {
        if (msg.sender != vaultOrToken) revert NotAuthorized();
        _;
    }

    modifier isValidReceiver(address receiver_) {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        _;
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
    ) external onlyRole(RESCUE_ROLE) {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
