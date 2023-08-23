pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/DeployMintableTokenStack.sol";
import "../src/ExchangeRate.sol";
import "../src/interfaces/ISocket.sol";
import "../src/interfaces/ICREATE3Factory.sol";
import "./mocks/Create3Factory.sol";

contract testDeployMintableTokenStack is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _socketAddress = address(uint160(_c++));
    address immutable _switchBoard = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _exchangeRate = address(uint160(_c++));

    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRatePerSecond = 1 ether;
    DeployMintableTokenStack deployer;

    function setUp() external {
        vm.startPrank(_admin);
        CREATE3Factory create3Factory = new CREATE3Factory();
        deployer = new DeployMintableTokenStack(_socketAddress, 420, ExchangeRate(_exchangeRate), ICREATE3Factory(create3Factory));
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

//         struct DeploymentInfo {
//     string tokenName;
//     string tokenSymbol;
//     address owner;
//     uint32[] chains;
//     uint8 tokenDecimals;
//     address[] switchboard;
//     address[] siblingConnectors;
//     LimitParams[] limitParams;
// }
// struct DeployToChains {
//     uint256[] gasLimits;
//     uint256 initialSupply;
//     DeploymentInfo data;
// }
        DeployToChains memory deployToChains = DeployToChains(
           {
                gasLimits: new uint256[](2),
                initialSupply: 10000,
                data: DeploymentInfo(
                     {
                          tokenName: "TestToken",
                          tokenSymbol: "TT",
                          owner: 0xe8dD38E673A93ccFC2E3d7053efcCb5c93F49365,
                          chains: chains,
                          tokenDecimals: 18,
                          switchboard: switchboards,
                          siblingConnectors: connectors,
                          limitParams: lockLimitParams
                     }
                )
           }
        );

        // deployer.deployMultiChain(
        //         deployToChains
        // );

        deployer.deploy(DeploymentInfo(
                     {
                          tokenName: "TestToken",
                          tokenSymbol: "TT",
                          owner: 0xe8dD38E673A93ccFC2E3d7053efcCb5c93F49365,
                          chains: chains,
                          tokenDecimals: 18,
                          switchboard: switchboards,
                          siblingConnectors: connectors,
                          limitParams: lockLimitParams
                     }), 10000000000000000000000);
        vm.stopPrank();
    }
}
