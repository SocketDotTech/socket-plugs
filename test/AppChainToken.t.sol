pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "./mocks/MintableToken.sol";
import "../contracts/superbridge/ConnectorPlug.sol";
import "../contracts/superbridge/Controller.sol";
import "../contracts/superbridge/ExchangeRate.sol";
import "./mocks/NonMintableToken.sol";
import "../contracts/superbridge/Vault.sol";
import "./mocks/MockSocket.sol";

contract TestAppChainToken is Test {
    struct NonAppChainContext {
        uint32 chainSlug;
        address fastSwitchboard;
        address slowSwitchboard;
        ERC20 token;
        Vault vault;
        ConnectorPlug fastConnector;
        ConnectorPlug slowConnector;
    }

    struct AppChainContext {
        uint32 chainSlug;
        address fastSwitchboard;
        address slowSwitchboard;
        ERC20 token;
        Controller controller;
        ExchangeRate exchangeRate;
        ConnectorPlug fastArbConnector;
        ConnectorPlug slowArbConnector;
        ConnectorPlug fastOptConnector;
        ConnectorPlug slowOptConnector;
    }

    uint256 _c;
    MockSocket _socket;
    address _admin;
    address _raju;
    address _ramu;

    AppChainContext _appChainCtx;
    NonAppChainContext _arbitrumCtx;
    NonAppChainContext _optimismCtx;

    uint256 public constant FAST_MAX_LIMIT = 100;
    uint256 public constant FAST_RATE = 1;
    uint256 public constant SLOW_MAX_LIMIT = 500;
    uint256 public constant SLOW_RATE = 2;
    uint256 public constant MSG_GAS_LIMIT = 200_000;
    uint256 public constant BOOTSTRAP_TIME = 250;

    error PlugDisconnected();

    function setUp() external {
        _admin = address(uint160(_c++));
        _raju = address(uint160(_c++));
        _ramu = address(uint160(_c++));

        _appChainCtx.chainSlug = uint32(_c++);
        _appChainCtx.fastSwitchboard = address(uint160(_c++));
        _appChainCtx.slowSwitchboard = address(uint160(_c++));

        _arbitrumCtx.chainSlug = uint32(_c++);
        _arbitrumCtx.fastSwitchboard = address(uint160(_c++));
        _arbitrumCtx.slowSwitchboard = address(uint160(_c++));

        _optimismCtx.chainSlug = uint32(_c++);
        _optimismCtx.fastSwitchboard = address(uint160(_c++));
        _optimismCtx.slowSwitchboard = address(uint160(_c++));

        _socket = new MockSocket();

        vm.startPrank(_admin);
        _deployNonAppChainContracts(_arbitrumCtx);
        _deployNonAppChainContracts(_optimismCtx);
        _deployAppChainContracts();

        _connectNonAppChainPlugs(
            _arbitrumCtx,
            address(_appChainCtx.fastArbConnector),
            address(_appChainCtx.slowArbConnector)
        );
        _connectNonAppChainPlugs(
            _optimismCtx,
            address(_appChainCtx.fastOptConnector),
            address(_appChainCtx.slowOptConnector)
        );
        _connectAppChainPlugs();

        _setNonAppChainLimits(_arbitrumCtx);
        _setNonAppChainLimits(_optimismCtx);
        _setAppChainLimits();
        _setAppChainPoolIds();
        vm.stopPrank();
    }

    function _deployNonAppChainContracts(
        NonAppChainContext storage nonAppChainCtx_
    ) internal {
        nonAppChainCtx_.token = new NonMintableToken(
            "Moon",
            "MOON",
            18,
            1_000_000_000 ether
        );
        nonAppChainCtx_.vault = new Vault(address(nonAppChainCtx_.token));
        nonAppChainCtx_.slowConnector = new ConnectorPlug(
            address(nonAppChainCtx_.vault),
            address(_socket),
            _appChainCtx.chainSlug
        );
        nonAppChainCtx_.fastConnector = new ConnectorPlug(
            address(nonAppChainCtx_.vault),
            address(_socket),
            _appChainCtx.chainSlug
        );
    }

    function _deployAppChainContracts() internal {
        _appChainCtx.token = new MintableToken("Moon", "MOON", 18);
        _appChainCtx.exchangeRate = new ExchangeRate();
        _appChainCtx.controller = new Controller(
            address(_appChainCtx.token),
            address(_appChainCtx.exchangeRate)
        );
        _appChainCtx.fastArbConnector = new ConnectorPlug(
            address(_appChainCtx.controller),
            address(_socket),
            _arbitrumCtx.chainSlug
        );
        _appChainCtx.slowArbConnector = new ConnectorPlug(
            address(_appChainCtx.controller),
            address(_socket),
            _arbitrumCtx.chainSlug
        );
        _appChainCtx.fastOptConnector = new ConnectorPlug(
            address(_appChainCtx.controller),
            address(_socket),
            _optimismCtx.chainSlug
        );
        _appChainCtx.slowOptConnector = new ConnectorPlug(
            address(_appChainCtx.controller),
            address(_socket),
            _optimismCtx.chainSlug
        );
    }

    function _connectNonAppChainPlugs(
        NonAppChainContext storage nonAppChainCtx_,
        address dstFastConnector,
        address dstSlowConnector
    ) internal {
        _socket.setLocalSlug(nonAppChainCtx_.chainSlug);
        nonAppChainCtx_.fastConnector.connect(
            dstFastConnector,
            nonAppChainCtx_.fastSwitchboard
        );
        nonAppChainCtx_.slowConnector.connect(
            dstSlowConnector,
            nonAppChainCtx_.slowSwitchboard
        );
    }

    function _connectAppChainPlugs() internal {
        _socket.setLocalSlug(_appChainCtx.chainSlug);
        _appChainCtx.fastArbConnector.connect(
            address(_arbitrumCtx.fastConnector),
            _appChainCtx.fastSwitchboard
        );
        _appChainCtx.slowArbConnector.connect(
            address(_arbitrumCtx.slowConnector),
            _appChainCtx.slowSwitchboard
        );
        _appChainCtx.fastOptConnector.connect(
            address(_optimismCtx.fastConnector),
            _appChainCtx.fastSwitchboard
        );
        _appChainCtx.slowOptConnector.connect(
            address(_optimismCtx.slowConnector),
            _appChainCtx.slowSwitchboard
        );
    }

    function _setNonAppChainLimits(
        NonAppChainContext storage nonAppChainCtx_
    ) internal {
        Vault.UpdateLimitParams[] memory u = new Vault.UpdateLimitParams[](4);
        u[0] = Vault.UpdateLimitParams(
            true,
            address(nonAppChainCtx_.fastConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = Vault.UpdateLimitParams(
            false,
            address(nonAppChainCtx_.fastConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[2] = Vault.UpdateLimitParams(
            true,
            address(nonAppChainCtx_.slowConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        u[3] = Vault.UpdateLimitParams(
            false,
            address(nonAppChainCtx_.slowConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        nonAppChainCtx_.vault.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function _setAppChainLimits() internal {
        Controller.UpdateLimitParams[]
            memory u = new Controller.UpdateLimitParams[](8);
        u[0] = Controller.UpdateLimitParams(
            true,
            address(_appChainCtx.fastArbConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = Controller.UpdateLimitParams(
            false,
            address(_appChainCtx.fastArbConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[2] = Controller.UpdateLimitParams(
            true,
            address(_appChainCtx.slowArbConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        u[3] = Controller.UpdateLimitParams(
            false,
            address(_appChainCtx.slowArbConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        u[4] = Controller.UpdateLimitParams(
            true,
            address(_appChainCtx.fastOptConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[5] = Controller.UpdateLimitParams(
            false,
            address(_appChainCtx.fastOptConnector),
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[6] = Controller.UpdateLimitParams(
            true,
            address(_appChainCtx.slowOptConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        u[7] = Controller.UpdateLimitParams(
            false,
            address(_appChainCtx.slowOptConnector),
            SLOW_MAX_LIMIT,
            SLOW_RATE
        );
        _appChainCtx.controller.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function _setAppChainPoolIds() internal {
        address[] memory connectors = new address[](2);
        uint256[] memory connectorPoolIds = new uint256[](2);
        connectors[0] = address(_appChainCtx.fastArbConnector);
        connectors[1] = address(_appChainCtx.fastOptConnector);

        connectorPoolIds[0] = _c++;
        connectorPoolIds[1] = _c++;

        _appChainCtx.controller.updateConnectorPoolId(
            connectors,
            connectorPoolIds
        );
        skip(BOOTSTRAP_TIME);
    }

    function _deposit(NonAppChainContext storage ctx_) internal {
        uint256 depositAmount = 44;
        vm.prank(_admin);
        ctx_.token.transfer(_raju, depositAmount);

        uint256 rajuBalBefore = ctx_.token.balanceOf(_raju);
        uint256 ramuBalBefore = _appChainCtx.token.balanceOf(_ramu);
        uint256 vaultBalBefore = ctx_.token.balanceOf(address(ctx_.vault));
        uint256 tokenSupplyBefore = _appChainCtx.token.totalSupply();

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        ctx_.token.approve(address(ctx_.vault), depositAmount);
        _socket.setLocalSlug(ctx_.chainSlug);
        ctx_.vault.depositToAppChain(
            _ramu,
            depositAmount,
            MSG_GAS_LIMIT,
            address(ctx_.fastConnector)
        );

        uint256 rajuBalAfter = ctx_.token.balanceOf(_raju);
        uint256 ramuBalAfter = _appChainCtx.token.balanceOf(_ramu);
        uint256 vaultBalAfter = ctx_.token.balanceOf(address(ctx_.vault));
        uint256 tokenSupplyAfter = _appChainCtx.token.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "Vault bal sus"
        );
        assertEq(
            tokenSupplyAfter,
            tokenSupplyBefore + depositAmount,
            "token supply sus"
        );
    }

    function testArbitrumDeposit() external {
        _deposit(_arbitrumCtx);
    }

    function testOptimismDeposit() external {
        _deposit(_optimismCtx);
    }

    function testDisconnect() external {
        hoax(_admin);
        _optimismCtx.fastConnector.disconnect();

        uint256 depositAmount = 100;
        vm.prank(_admin);
        _optimismCtx.token.transfer(_raju, depositAmount);

        vm.startPrank(_raju);
        _optimismCtx.token.approve(address(_optimismCtx.vault), depositAmount);

        vm.expectRevert(PlugDisconnected.selector);
        _optimismCtx.vault.depositToAppChain(
            _ramu,
            depositAmount,
            MSG_GAS_LIMIT,
            address(_optimismCtx.fastConnector)
        );
    }
}
