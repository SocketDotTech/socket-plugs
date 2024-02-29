pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";

import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import {AccessControl} from "../common/AccessControl.sol";
import {IHub, IConnector} from "./ConnectorPlug.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
abstract contract SuperBridgeBase is ReentrancyGuard, IHub, AccessControl {
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

    error ZeroAddressReceiver();
    error ZeroAmount();

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
