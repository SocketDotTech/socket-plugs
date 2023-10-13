pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/CrossChainToken/DeployCrossChainTokenStack.sol";
import "../src/interfaces/ISocket.sol";

contract testDeployMintableTokenStack is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _socketAddress = address(uint160(_c++));
    address immutable _switchBoard = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _exchangeRate = address(uint160(_c++));

    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRatePerSecond = 1 ether;
    DeployCrossChainTokenStack deployer;

    function setUp() external {
        vm.startPrank(_admin);
        deployer = new DeployCrossChainTokenStack(_admin, _socketAddress, 420);
        vm.stopPrank();
    }

    function testDeployment() external {
        vm.startPrank(_admin);
        LimitParams[] memory lockLimitParams = new LimitParams[](4);
        lockLimitParams[0] = LimitParams(_lockMaxLimit, _lockRatePerSecond);
        lockLimitParams[1] = LimitParams(_lockMaxLimit, _lockRatePerSecond);
        lockLimitParams[2] = LimitParams(_lockMaxLimit, _lockRatePerSecond);
        lockLimitParams[3] = LimitParams(_lockMaxLimit, _lockRatePerSecond);


        address[] memory connectors = new address[](3);
        connectors[0] = _connector;
        connectors[1] = _connector;
        connectors[2] = _connector;

        uint32[] memory chains = new uint32[](4);
        chains[0] = 420;
        chains[1] = 421613;
        chains[2] = 80001;
        chains[3] = 5;

        address[] memory switchboards = new address[](4);
        switchboards[0] = _switchBoard;
        switchboards[1] = _switchBoard;
        switchboards[2] = _switchBoard;
        switchboards[3] = _switchBoard;

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
                vm.mockCall(
            _socketAddress,
            abi.encodeCall(
                ISocket.connect,
                (chains[2], _connector, _switchBoard, _switchBoard)
            ),
            bytes("0")
        );

                        vm.mockCall(
            _socketAddress,
            abi.encodeCall(
                ISocket.connect,
                (chains[3], _connector, _switchBoard, _switchBoard)
            ),
            bytes("0")
        );

        DeployToChains memory deployToChains = DeployToChains(
           {
                gasLimits: new uint256[](3),
                values: new uint256[](3),
                initialSupply: 10000,
                data: DeploymentInfo(
                     {
                          tokenName: "TestToken",
                          tokenSymbol: "TT",
                          owner: 0xe8dD38E673A93ccFC2E3d7053efcCb5c93F49365,
                          chains: chains,
                          tokenDecimals: 18,
                          switchboard: switchboards,
                          limitParams: lockLimitParams
                     }
                )
           }
        );

        // deployer.deployMultiChain(deployToChains);
        vm.stopPrank();
    }
}