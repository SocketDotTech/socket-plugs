pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/MintableToken.sol";
import "../src/ConnectorPlug.sol";
import "../src/Controller.sol";
import "../src/ExchangeRate.sol";
import "../src/NonMintableToken.sol";
import "../src/Vault.sol";
// import "../src/mocks/MockSocket.sol";
import "../src/interfaces/ISocket.sol";

contract MockSocket is ISocket {
    uint32 _localSlug;

    struct PlugConfig {
        address siblingPlug;
        address inboundSwitchboard;
        address outboundSwitchboard;
    }
    //  localSlug => localPlug => siblingSlug => config(inboundSwitchboard, outboundSwitchboard, siblingPlug)
    mapping(uint32 => mapping(address => mapping(uint32 => PlugConfig)))
        public plugConfigs;

    error WrongSiblingPlug();

    function chainSlug() external view override returns (uint32) {
        return _localSlug;
    }

    function setLocalSlug(uint32 localSlug_) external {
        _localSlug = localSlug_;
    }

    function connect(
        uint32 siblingChainSlug_,
        address siblingPlug_,
        address inboundSwitchboard_,
        address outboundSwitchboard_
    ) external override {
        PlugConfig storage plugConfig = plugConfigs[_localSlug][msg.sender][
            siblingChainSlug_
        ];

        plugConfig.siblingPlug = siblingPlug_;
        plugConfig.inboundSwitchboard = inboundSwitchboard_;
        plugConfig.outboundSwitchboard = outboundSwitchboard_;
    }

    function outbound(
        uint32 siblingChainSlug_,
        uint256 minMsgGasLimit_,
        bytes32,
        bytes32,
        bytes calldata payload_
    ) external payable override returns (bytes32) {
        PlugConfig memory srcPlugConfig = plugConfigs[_localSlug][msg.sender][
            siblingChainSlug_
        ];

        PlugConfig memory dstPlugConfig = plugConfigs[siblingChainSlug_][
            srcPlugConfig.siblingPlug
        ][_localSlug];

        if (dstPlugConfig.siblingPlug != msg.sender) revert WrongSiblingPlug();
        IPlug(srcPlugConfig.siblingPlug).inbound{gas: minMsgGasLimit_}(
            _localSlug,
            payload_
        );

        return bytes32(0);
    }

    // ignore ISocket function
    function execute(
        ISocket.ExecutionDetails calldata executionDetails_,
        ISocket.MessageDetails calldata messageDetails_
    ) external payable override {}

    // ignore ISocket function
    function getMinFees(
        uint256 minMsgGasLimit_,
        uint256 payloadSize_,
        bytes32 executionParams_,
        bytes32 transmissionParams_,
        uint32 siblingChainSlug_,
        address plug_
    ) external view override returns (uint256 totalFees) {}
}

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

    struct UpdateLimitParams {
        bool isLock;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    uint256 _c;
    MockSocket _socket;
    address _admin;
    address _raju;

    AppChainContext _appChainCtx;
    NonAppChainContext _arbitrumCtx;
    NonAppChainContext _optimismCtx;

    uint256 public constant FAST_MAX_LIMIT = 100;
    uint256 public constant FAST_RATE = 1;
    uint256 public constant SLOW_MAX_LIMIT = 500;
    uint256 public constant SLOW_RATE = 2;

    function setUp() external {
        _admin = address(uint160(_c++));
        _raju = address(uint160(_c++));

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

        _deployNonAppChainContracts(_arbitrumCtx);
        _deployNonAppChainContracts(_optimismCtx);
        _deployAppChainContracts();

        _connectNonAppChainPlugs(_arbitrumCtx);
        _connectNonAppChainPlugs(_optimismCtx);
        _connectAppChainPlugs();

        _setNonAppChainLimits(_arbitrumCtx);
        _setNonAppChainLimits(_optimismCtx);
        _setAppChainLimits();
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
        nonAppChainCtx_.vault = new Vault(
            address(nonAppChainCtx_.token),
            _appChainCtx.chainSlug
        );
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
        NonAppChainContext storage nonAppChainCtx_
    ) internal {
        _socket.setLocalSlug(nonAppChainCtx_.chainSlug);
        nonAppChainCtx_.fastConnector.connect(
            address(_appChainCtx.fastArbConnector),
            nonAppChainCtx_.fastSwitchboard
        );
        nonAppChainCtx_.slowConnector.connect(
            address(_appChainCtx.slowArbConnector),
            nonAppChainCtx_.slowSwitchboard
        );
    }

    function _connectAppChainPlugs() internal {
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
    }

    function test() external {
        console.log("setup done");
    }
}
