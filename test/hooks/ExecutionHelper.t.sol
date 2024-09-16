// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Test.sol";
import {ExecutionHelper} from "../../contracts/hooks/plugins/ExecutionHelper.sol";

contract MockContractWithCustomError is ExecutionHelper(msg.sender) {
    error CustomError(uint256 a, uint256 b, address c);

    function throwPanicError() external pure {
        uint256[] memory emptyArray = new uint256[](0);
        emptyArray[0] = 1; // This will cause a panic due to out-of-bounds array access
    }

    function throwCustomError() external view {
        revert CustomError(1, 2, address(this));
    }

    function throwCustomErrorWithMessage() external pure {
        require(false, "Custom error with message");
    }

    function getRevertMsg(
        bytes memory returnData
    ) external pure returns (bytes memory) {
        return _getRevertMsg(returnData);
    }
}

contract ExecutionHelperTest is Test {
    ExecutionHelper private executionHelper;
    MockContractWithCustomError private mockContract;

    function setUp() public {
        executionHelper = new ExecutionHelper(address(this));
        mockContract = new MockContractWithCustomError();
    }

    function testGetRevertMsgWithCustomError() public {
        // Attempt to call the function that throws a custom error
        (bool success, bytes memory returnData) = address(mockContract).call(
            abi.encodeWithSignature("throwCustomError()")
        );

        // Ensure the call failed
        assertFalse(success);

        // Use the _getRevertMsg function to decode the error
        bytes memory errorMessage = mockContract.getRevertMsg(returnData);
        bytes memory expectedError = abi.encodeWithSignature(
            "CustomError(uint256,uint256,address)",
            1,
            2,
            address(mockContract)
        );

        // Check if the error message matches the expected custom error message
        assertEq(errorMessage, expectedError);
    }

    function testGetRevertMsgWithRevertString() public {
        // Attempt to call the function that throws a custom error
        (bool success, bytes memory returnData) = address(mockContract).call(
            abi.encodeWithSignature("throwCustomErrorWithMessage()")
        );

        // Ensure the call failed
        assertFalse(success);

        // Use the _getRevertMsg function to decode the error
        bytes memory errorMessage = mockContract.getRevertMsg(returnData);
        bytes memory expectedError = abi.encodeWithSignature(
            "Error(string)",
            "Custom error with message"
        );

        // Check if the error message matches the expected custom error message
        assertEq(errorMessage, expectedError);
    }

    function testGetRevertMsgWithPanicError() public {
        // Attempt to call the function that throws a panic error
        (bool success, bytes memory returnData) = address(mockContract).call(
            abi.encodeWithSignature("throwPanicError()")
        );

        // Ensure the call failed
        assertFalse(success);

        // Use the _getRevertMsg function to decode the error
        bytes memory errorMessage = mockContract.getRevertMsg(returnData);

        // The panic error code for out-of-bounds array access is 0x32
        bytes memory expectedError = abi.encodeWithSignature(
            "Panic(uint256)",
            0x32
        );

        // Check if the error message length is less than 68
        assertLt(expectedError.length, 68);

        // Check if the error message matches the expected empty bytes
        assertEq(errorMessage, bytes(""));
    }
}
