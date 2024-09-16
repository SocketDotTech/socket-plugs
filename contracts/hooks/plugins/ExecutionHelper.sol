// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "../../libraries/ExcessivelySafeCall.sol";
import "../../utils/RescueBase.sol";
import "../../common/Errors.sol";

/**
 * @title ExecutionHelper
 * @notice It is an untrusted contract used for payload execution by Super token and Vault.
 */
contract ExecutionHelper is RescueBase {
    using ExcessivelySafeCall for address;
    uint16 private constant MAX_COPY_BYTES = 0;
    address public hook;
    bytes32 public messageId;
    uint256 public bridgeAmount;

    event ExecutionFailed(bytes reason);

    constructor(address owner_) AccessControl(owner_) {
        _grantRole(RESCUE_ROLE, owner_);
    }

    modifier onlyHook() {
        require(msg.sender == hook, "ExecutionHelper: only hook");
        _;
    }

    function setHook(address hook_) external onlyOwner {
        hook = hook_;
    }

    /**
     * @notice this function is used to execute a payload at target_
     * @dev receiver address cannot be this contract address.
     * @param target_ address of target.
     * @param payload_ payload to be executed at target.
     */
    function execute(
        address target_,
        bytes memory payload_,
        bytes32 messageId_,
        uint256 bridgeAmount_
    ) external onlyHook returns (bool success) {
        if (target_ == address(this)) return false;

        messageId = messageId_;
        bridgeAmount = bridgeAmount_;

        bytes memory returnData;
        (success, returnData) = target_.excessivelySafeCall(
            gasleft(),
            MAX_COPY_BYTES,
            payload_
        );

        if (!success) emit ExecutionFailed(_getRevertMsg(returnData));

        messageId = bytes32(0);
        bridgeAmount = 0;
    }

    function _getRevertMsg(
        bytes memory _returnData
    ) internal pure returns (bytes memory) {
        // If the _res length is less than 68, then the transaction failed silently (without a revert message)
        if (_returnData.length < 68) return bytes("");
        return _returnData;
    }
}
