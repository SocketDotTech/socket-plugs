pragma solidity 0.8.13;

import "../../libraries/ExcessivelySafeCall.sol";

/**
 * @title ExecutionHelper
 * @notice It is an untrusted contract used for payload execution by Super token and Vault.
 */
contract ExecutionHelper {
    using ExcessivelySafeCall for address;
    uint16 private constant MAX_COPY_BYTES = 0;

    /**
     * @notice this function is used to execute a payload at target_
     * @dev receiver address cannot be this contract address.
     * @param target_ address of target.
     * @param payload_ payload to be executed at target.
     */
    function execute(
        address target_,
        bytes memory payload_
    ) external returns (bool success) {
        if (target_ == address(this)) return false;
        (success, ) = target_.excessivelySafeCall(
            gasleft(),
            MAX_COPY_BYTES,
            payload_
        );
    }
}
