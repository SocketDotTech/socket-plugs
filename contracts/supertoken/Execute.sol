pragma solidity 0.8.13;

import "solmate/utils/ReentrancyGuard.sol";
import "../libraries/ExcessivelySafeCall.sol";

/**
 * @title Execute
 * @notice It enables payload execution and contains relevant storages.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
contract Execute is ReentrancyGuard {
    using ExcessivelySafeCall for address;

    struct PendingExecutionDetails {
        address receiver;
        uint32 siblingChainSlug;
        bytes payload;
        bool isAmountPending;
    }

    uint16 private constant MAX_COPY_BYTES = 150;
    // messageId => PendingExecutionDetails
    mapping(bytes32 => PendingExecutionDetails) public pendingExecutions;

    error InvalidExecutionRetry();
    error PendingAmount();
    error CannotExecuteOnBridgeContracts();

    function retryPayloadExecution(bytes32 msgId_) external nonReentrant {
        PendingExecutionDetails storage details = pendingExecutions[msgId_];
        if (details.isAmountPending) revert PendingAmount();

        if (details.receiver == address(0)) revert InvalidExecutionRetry();
        bool success = _execute(details.receiver, details.payload);

        if (success) _clearPayload(msgId_);
    }

    function _execute(
        address receiver_,
        bytes memory payload_
    ) internal returns (bool success) {
        (success, ) = receiver_.excessivelySafeCall(
            gasleft(),
            MAX_COPY_BYTES,
            payload_
        );
    }

    function _cachePayload(
        bytes32 msgId_,
        uint32 siblingChainSlug_,
        bool isAmountPending_,
        address receiver_,
        bytes memory payload_
    ) internal {
        pendingExecutions[msgId_].receiver = receiver_;
        pendingExecutions[msgId_].siblingChainSlug = siblingChainSlug_;
        pendingExecutions[msgId_].payload = payload_;
        pendingExecutions[msgId_].isAmountPending = isAmountPending_;
    }

    function _clearPayload(bytes32 msgId_) internal {
        pendingExecutions[msgId_].receiver = address(0);
        pendingExecutions[msgId_].siblingChainSlug = 0;
        pendingExecutions[msgId_].payload = bytes("");
        pendingExecutions[msgId_].isAmountPending = false;
    }
}
