pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "../contracts/common/Errors.sol";
import "../contracts/ConnectorPlug.sol";
import "../contracts/interfaces/ISocket.sol";
import "forge-std/console.sol";

contract TestVault is Test {
    uint256 _c = 1000;
    ConnectorPlug connectorPlug;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _bridge = address(uint160(_c++));
    address immutable _socket = address(uint160(_c++));
    uint32 immutable _siblingChainSlug = uint32(_c++);
    bytes32 immutable _messageId = bytes32(_c++);
    uint256 constant _fees = 0.001 ether;
    uint256 constant _amount = 1 ether;
    uint256 constant _msgGasLimit = 200_000;
    bytes32 immutable _transmissionParams = bytes32(_c++);

    function setUp() external {
        connectorPlug = new ConnectorPlug(
            address(_bridge),
            address(_socket),
            _siblingChainSlug,
            _transmissionParams
        );
    }

    function testNotBridgeSender() public {
        bytes memory options = "";
        bytes memory payload = abi.encode(_raju, _amount);
        vm.prank(_raju);
        vm.expectRevert(NotBridge.selector);
        connectorPlug.outbound(_msgGasLimit, payload, options);
    }

    function testInvalidLengthOptions() public {
        bytes memory options = abi.encode(
            bytes32(uint256(1)),
            bytes32(uint256(2))
        );
        bytes memory payload = abi.encode(_raju, _amount);
        vm.prank(_bridge);
        vm.expectRevert(InvalidOptionsLength.selector);
        connectorPlug.outbound(_msgGasLimit, payload, options);
    }

    function testOutboundWithEmptyOptions() public {
        // Setup
        bytes memory options = "";
        bytes memory payload = abi.encode(_raju, _amount);

        // Test
        vm.expectCall(
            _socket,
            abi.encodeCall(
                ISocket.outbound,
                (
                    _siblingChainSlug,
                    _msgGasLimit,
                    bytes32(0),
                    _transmissionParams,
                    payload
                )
            )
        );

        vm.mockCall(
            _socket,
            abi.encodeCall(
                ISocket.outbound,
                (
                    _siblingChainSlug,
                    _msgGasLimit,
                    bytes32(0),
                    _transmissionParams,
                    payload
                )
            ),
            abi.encode(_messageId)
        );
        vm.prank(_bridge);
        bytes32 messageId = connectorPlug.outbound(
            _msgGasLimit,
            payload,
            options
        );

        // Assert
        assertEq(messageId, _messageId, "MessageId not matched");
    }

    function testOutboundWithOptions() public {
        // Setup
        bytes32 executionParams = bytes32(uint256(1));
        bytes memory options = abi.encode(executionParams);
        bytes memory payload = abi.encode(_raju, _amount);

        // Test
        vm.expectCall(
            _socket,
            abi.encodeCall(
                ISocket.outbound,
                (
                    _siblingChainSlug,
                    _msgGasLimit,
                    executionParams,
                    _transmissionParams,
                    payload
                )
            )
        );

        vm.mockCall(
            _socket,
            abi.encodeCall(
                ISocket.outbound,
                (
                    _siblingChainSlug,
                    _msgGasLimit,
                    executionParams,
                    _transmissionParams,
                    payload
                )
            ),
            abi.encode(_messageId)
        );
        vm.prank(_bridge);
        bytes32 messageId = connectorPlug.outbound(
            _msgGasLimit,
            payload,
            options
        );

        // Assert
        assertEq(messageId, _messageId, "MessageId not matched");
    }
}
