pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "./interfaces/IHub.sol";
import "./utils/RescueBase.sol";

/**
 * @title Base contract for super token and vault
 * @notice It contains relevant execution payload storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
abstract contract Base is ReentrancyGuard, IHub, RescueBase {

}
