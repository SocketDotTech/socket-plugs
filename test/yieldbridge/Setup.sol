pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";

import "../../contracts/yield-bridge/YieldVault.sol";
import "../../contracts/yield-bridge/YieldToken.sol";
import "../../contracts/superbridge/ConnectorPlug.sol";

import "../mocks/MockSocket.sol";
import "../mocks/MockStrategy.sol";

contract SetupYieldBridge is Test {
    uint256 _c;
    address _admin;
    address _raju;
    address _ramu;
    address _fastSwitchboard;
    address _otherFastSwitchboard;

    uint32 _chainSlug;
    uint32 _otherChainSlug;

    MockSocket _socket;

    MintableToken _token;
    MockStrategy _strategy;
    YieldVault _yieldVault;
    ConnectorPlug _fastVaultConnector;

    YieldToken _yieldToken;
    ConnectorPlug _fastControllerConnector;

    uint256 public constant FAST_MAX_LIMIT = 100;
    uint256 public constant FAST_RATE = 1;
    uint256 public constant SLOW_MAX_LIMIT = 500;
    uint256 public constant SLOW_RATE = 2;
    uint256 public constant MSG_GAS_LIMIT = 200_000;
    uint256 public constant BOOTSTRAP_TIME = 250;

    uint256 public constant DEBT_RATIO = 8000;
    uint128 public constant REBALANCE_DELAY = 100;
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

    function setUp() external {
        _admin = address(uint160(_c++));
        _raju = address(uint160(_c++));
        _ramu = address(uint160(_c++));

        _chainSlug = uint32(_c++);
        _fastSwitchboard = address(uint160(_c++));

        _otherChainSlug = uint32(_c++);
        _otherFastSwitchboard = address(uint160(_c++));

        vm.startPrank(_admin);

        _socket = new MockSocket();
        _token = new MintableToken("Moon", "MOON", 18);

        _setupVault();
        _setupController();

        _connectPlugs(
            _fastControllerConnector,
            _otherChainSlug,
            address(_fastVaultConnector),
            _otherFastSwitchboard
        );
        _connectPlugs(
            _fastVaultConnector,
            _chainSlug,
            address(_fastControllerConnector),
            _fastSwitchboard
        );

        vm.stopPrank();
    }

    function _setupVault() internal {
        _strategy = new MockStrategy(address(_token));
        _yieldVault = new YieldVault(
            DEBT_RATIO,
            REBALANCE_DELAY,
            address(_strategy),
            address(_token)
        );
        _fastVaultConnector = new ConnectorPlug(
            address(_yieldVault),
            address(_socket),
            _otherChainSlug
        );

        _setLimits(address(_yieldVault), address(_fastVaultConnector));
    }

    function _setupController() internal {
        _yieldToken = new YieldToken("Moon", "MOON", 18);
        _fastControllerConnector = new ConnectorPlug(
            address(_yieldToken),
            address(_socket),
            _chainSlug
        );
        _setLimits(address(_yieldToken), address(_fastControllerConnector));
    }

    function _connectPlugs(
        ConnectorPlug plug,
        uint32 slug,
        address siblingPlug,
        address plugSwitchboard
    ) internal {
        _socket.setLocalSlug(slug);
        plug.connect(siblingPlug, plugSwitchboard);
    }

    function _setLimits(address controller, address connector) internal {
        LimitController(controller).grantRole(LIMIT_UPDATER_ROLE, _admin);

        LimitController.UpdateLimitParams[]
            memory u = new LimitController.UpdateLimitParams[](8);
        u[0] = LimitController.UpdateLimitParams(
            true,
            connector,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = LimitController.UpdateLimitParams(
            false,
            connector,
            FAST_MAX_LIMIT,
            FAST_RATE
        );

        LimitController(controller).updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }
}
