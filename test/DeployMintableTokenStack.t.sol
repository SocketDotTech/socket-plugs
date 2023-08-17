pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/DeployMintableTokenStack.sol";
import "../src/interfaces/ISocket.sol";

contract testDeployMintableTokenStack is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _socketAddress = address(uint160(_c++));
    address immutable _switchBoard = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));

    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRatePerSecond = 1 ether;
    DeployMintableTokenStack deployer;

    function setUp() external {
        vm.startPrank(_admin);
        deployer = new DeployMintableTokenStack(_socketAddress, 420);
        vm.stopPrank();
    }

    function testDeployment() external {
        vm.startPrank(_admin);
        LimitParams[] memory lockLimitParams = new LimitParams[](2);
        lockLimitParams[0] = LimitParams(_lockMaxLimit, _lockRatePerSecond);
        lockLimitParams[1] = LimitParams(_lockMaxLimit, _lockRatePerSecond);

        address[] memory connectors = new address[](2);
        connectors[0] = _connector;
        connectors[1] = _connector;

        uint32[] memory chains = new uint32[](2);
        chains[0] = 420;
        chains[1] = 421613;

        address[] memory switchboards = new address[](2);
        switchboards[0] = _switchBoard;
        switchboards[1] = _switchBoard;

        vm.mockCall(
            _socketAddress,
            abi.encodeCall(
                ISocket.connect,
                (chains[0], _connector, _switchBoard, _switchBoard)
            ),
            bytes("0")
        );

        vm.mockCall(
            _socketAddress,
            abi.encodeCall(
                ISocket.connect,
                (chains[1], _connector, _switchBoard, _switchBoard)
            ),
            bytes("0")
        );

        // deployer.deploy(
        //     "ANIMOJI TOKEN",
        //     "ANIMOJI",
        //     chains,
        //     18,
        //     switchboards,
        //     connectors,
        //     lockLimitParams
        // );
        vm.stopPrank();
    }
}
