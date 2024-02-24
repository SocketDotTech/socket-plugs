pragma solidity 0.8.13;

import "../plugins/ExecutionHelper.sol";
import "./HookBase.sol";

abstract contract ExecutablePayloadHookBase is HookBase, ExecutionHelper {
    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error InvalidExecutionRetry();
    error PendingAmount();
    error CannotExecuteOnBridgeContracts();

    // /**
    //  * @notice this function can be used to retry a payload execution if it was not successful.
    //  * @param msgId_ The unique identifier of the bridging message.
    //  */
    // function retryPayloadExecution(bytes32 msgId_) external nonReentrant {
    //     PendingExecutionDetails storage details = pendingExecutions[msgId_];
    //     if (details.isAmountPending) revert PendingAmount();

    //     if (details.receiver == address(0)) revert InvalidExecutionRetry();
    //     bool success = executionHelper__.execute(
    //         details.receiver,
    //         details.payload
    //     );

    //     if (success) _clearPayload(msgId_);
    // }
}
