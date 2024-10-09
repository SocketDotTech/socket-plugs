// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "forge-std/Test.sol";
import {ExecutionHelper} from "../../contracts/hooks/plugins/ExecutionHelper.sol";
import {Ownable} from "../../contracts/utils/Ownable.sol";

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

contract MockContractWithoutRevert {
    function someFunction() external pure returns (bool) {
        return true;
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

    function testExecuteSuccess() public {
        // Setup a mock contract that doesn't revert
        MockContractWithoutRevert mockWithoutRevert = new MockContractWithoutRevert();

        // Prepare test data
        bytes32 testMessageId = keccak256("testMessage");
        uint256 testBridgeAmount = 1000;
        bytes memory payload = abi.encodeWithSignature("someFunction()");

        // Set the hook to this test contract
        executionHelper.setHook(address(this));

        // Execute
        bool success = executionHelper.execute(
            address(mockWithoutRevert),
            payload,
            testMessageId,
            testBridgeAmount
        );

        // Assert
        assertTrue(success);
        assertEq(executionHelper.messageId(), bytes32(0));
        assertEq(executionHelper.bridgeAmount(), 0);
    }

    function testExecuteFailure() public {
        // Prepare test data
        bytes32 testMessageId = keccak256("testMessage");
        uint256 testBridgeAmount = 1000;
        bytes memory payload = abi.encodeWithSignature("throwCustomError()");

        // Set the hook to this test contract
        executionHelper.setHook(address(this));

        // Execute
        bool success = executionHelper.execute(
            address(mockContract),
            payload,
            testMessageId,
            testBridgeAmount
        );

        // Assert
        assertFalse(success);
        assertEq(executionHelper.messageId(), bytes32(0));
        assertEq(executionHelper.bridgeAmount(), 0);
    }

    function testExecuteWithThisContractAsTarget() public {
        // Set the hook to this test contract
        executionHelper.setHook(address(this));

        // Try to execute with ExecutionHelper as the target
        bool success = executionHelper.execute(
            address(executionHelper),
            "",
            bytes32(0),
            0
        );

        // Assert
        assertFalse(success);
    }

    function testSetHook() public {
        address newHook = address(0x123);

        // Set the new hook
        executionHelper.setHook(newHook);

        // Check if the hook was set correctly
        assertEq(executionHelper.hook(), newHook);
    }

    function testSetHookOnlyOwner() public {
        address newHook = address(0x123);

        // Try to set the hook from a non-owner address
        vm.prank(address(0xABC));
        vm.expectRevert(Ownable.OnlyOwner.selector);
        executionHelper.setHook(newHook);
    }

    function testOnlyHookModifier() public {
        bytes memory payload = abi.encodeWithSignature("someFunction()");

        // Try to execute without setting the hook
        vm.expectRevert("ExecutionHelper: only hook");
        executionHelper.execute(address(0), payload, bytes32(0), 0);

        // Set the hook to this test contract
        executionHelper.setHook(address(this));

        // Now it should not revert
        executionHelper.execute(address(0), payload, bytes32(0), 0);
    }
}
