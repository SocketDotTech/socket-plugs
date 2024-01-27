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

    /**
     * @notice this struct stores relevant details for a pending payload execution
     * @param receiver address of receiver where payload executes.
     * @param siblingChainSlug the unique identifier of the source chain.
     * @param payload payload to be executed
     * @param isAmountPending if amount to be bridged is pending
     */
    struct PendingExecutionDetails {
        address receiver;
        uint32 siblingChainSlug;
        bytes payload;
        bool isAmountPending;
    }

    uint16 private constant MAX_COPY_BYTES = 0;
    // messageId => PendingExecutionDetails
    mapping(bytes32 => PendingExecutionDetails) public pendingExecutions;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error InvalidExecutionRetry();
    error PendingAmount();
    error CannotExecuteOnBridgeContracts();

    /**
     * @notice this function can be used to retry a payload execution if it was not successful.
     * @param msgId_ The unique identifier of the bridging message.
     */
    function retryPayloadExecution(bytes32 msgId_) external nonReentrant {
        PendingExecutionDetails storage details = pendingExecutions[msgId_];
        if (details.isAmountPending) revert PendingAmount();

        if (details.receiver == address(0)) revert InvalidExecutionRetry();
        bool success = _execute(details.receiver, details.payload);

        if (success) _clearPayload(msgId_);
    }

    /**
     * @notice this function is used to execute a payload at receiver
     * @dev receiver address cannot be bridge address or this contract address.
     * @param target_ address of target.
     * @param payload_ payload to be executed at target.
     */
    function _execute(
        address target_,
        bytes memory payload_
    ) internal returns (bool success) {
        (success, ) = target_.excessivelySafeCall(
            gasleft(),
            MAX_COPY_BYTES,
            payload_
        );
    }

    /**
     * @notice this function caches the execution payload details if the amount to be bridged
     * is not pending or execution is reverting
     */
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

    /**
     * @notice this function clears the payload details once execution succeeds
     */
    function _clearPayload(bytes32 msgId_) internal {
        pendingExecutions[msgId_].receiver = address(0);
        pendingExecutions[msgId_].siblingChainSlug = 0;
        pendingExecutions[msgId_].payload = bytes("");
        pendingExecutions[msgId_].isAmountPending = false;
    }
}
