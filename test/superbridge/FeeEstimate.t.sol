pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "../../contracts/superbridge/ConnectorPlug.sol";
import "../../contracts/superbridge/Controller.sol";
import "../../contracts/superbridge/Vault.sol";
import "../../contracts/superbridge/ExchangeRate.sol";

contract TestFeesEstimate is Test {
    uint256 _c = 1;
    address _token = address(uint160(_c++));
    address _socket = address(uint160(_c++));
    uint32 _controllerSlug = uint32(_c++);
    uint32 _vaultSlug = uint32(_c++);
    ConnectorPlug _controllerConnector;
    ConnectorPlug _vaultConnector;
    Controller _controller;
    Vault _vault;
    uint256 _msgGasLimit = 200_000;
    uint256 _fees = 500_000_000;

    function setUp() external {
        _controller = new Controller(_token, address(new ExchangeRate()));
        _vault = new Vault(_token);
        _controllerConnector = new ConnectorPlug(
            address(_controller),
            _socket,
            _vaultSlug
        );
        _vaultConnector = new ConnectorPlug(
            address(_vault),
            _socket,
            _controllerSlug
        );
    }

    function testControllerFeesEstimate() external {
        vm.mockCall(
            _socket,
            abi.encodeCall(
                ISocket.getMinFees,
                (
                    _msgGasLimit,
                    64,
                    bytes32(0),
                    bytes32(0),
                    _vaultSlug,
                    address(_controllerConnector)
                )
            ),
            abi.encode(_fees)
        );
        vm.expectCall(
            _socket,
            abi.encodeCall(
                ISocket.getMinFees,
                (
                    _msgGasLimit,
                    64,
                    bytes32(0),
                    bytes32(0),
                    _vaultSlug,
                    address(_controllerConnector)
                )
            )
        );

        uint256 fees = _controller.getMinFees(
            address(_controllerConnector),
            _msgGasLimit
        );
        assertEq(fees, _fees, "controller fees sus");
    }

    function testVaultFeesEstimate() external {
        vm.mockCall(
            _socket,
            abi.encodeCall(
                ISocket.getMinFees,
                (
                    _msgGasLimit,
                    64,
                    bytes32(0),
                    bytes32(0),
                    _controllerSlug,
                    address(_vaultConnector)
                )
            ),
            abi.encode(_fees)
        );
        vm.expectCall(
            _socket,
            abi.encodeCall(
                ISocket.getMinFees,
                (
                    _msgGasLimit,
                    64,
                    bytes32(0),
                    bytes32(0),
                    _controllerSlug,
                    address(_vaultConnector)
                )
            )
        );

        uint256 fees = _vault.getMinFees(
            address(_vaultConnector),
            _msgGasLimit
        );
        assertEq(fees, _fees, "vault fees sus");
    }
}
