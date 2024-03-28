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

    constructor(address owner_) AccessControl(owner_) {}

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

        (success, ) = target_.excessivelySafeCall(
            gasleft(),
            MAX_COPY_BYTES,
            payload_
        );
        
        messageId = bytes32(0);
        bridgeAmount = 0;
    }
}
