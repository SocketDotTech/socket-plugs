pragma solidity 0.8.13;

// import "forge-std/Test.sol";
// import "solmate/tokens/ERC20.sol";

// import "../../contracts/token/yield-token/YieldToken.sol";
// import {Vault} from "../../contracts/bridge/Vault.sol";
// import {Controller} from "../../contracts/bridge/Controller.sol";
// import {LimitExecutionHook} from "../../contracts/hooks/Vault_YieldLimitExecHook.sol";
// import {MockYieldTokenHook} from "../mocks/hooks/MockYieldTokenHook.sol";
// import {MockYieldBridgeHook} from "../mocks/hooks/MockYieldBridgeHook.sol";

// import "../../contracts/ConnectorPlug.sol";
// import "../../contracts/hooks/plugins/ExecutionHelper.sol";
// import "../../contracts/common/Structs.sol";

// import "../mocks/MintableToken.sol";
// import "../mocks/MockSocket.sol";
// import "../mocks/MockStrategy.sol";

// contract SetupYieldBridge is Test {
//     uint256 _c;
//     address _admin;
//     address _raju;
//     address _ramu;
//     address _fastSwitchboard;
//     address _otherFastSwitchboard;

//     uint32 _chainSlug;
//     uint32 _otherChainSlug;
//     uint256 immutable _connectorPoolId = 1;

//     MockSocket socket__;
//     ExecutionHelper executionHelper__;

//     MintableToken token__;
//     MockStrategy strategy__;
//     Vault vault__;
//     MockYieldBridgeHook vaultHook__;
//     ConnectorPlug fastVaultConnector__;

//     YieldToken yieldToken__;
//     Controller controller__;
//     MockYieldTokenHook controllerHook__;
//     ConnectorPlug fastControllerConnector__;

//     uint256 public constant FAST_MAX_LIMIT = 10000;
//     uint256 public constant FAST_RATE = 1;
//     uint256 public constant SLOW_MAX_LIMIT = 5000;
//     uint256 public constant SLOW_RATE = 2;
//     uint256 public constant MSG_GAS_LIMIT = 200_000;
//     uint256 public constant BOOTSTRAP_TIME = 250;

//     uint256 public constant DEBT_RATIO = 8000;
//     uint128 public constant REBALANCE_DELAY = 1;

//     bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
//     bytes32 constant HOOK_ROLE = keccak256("HOOK_ROLE");
//     bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");
//     bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");
//     address[] connectors;
//     uint256[] poolIds;
//     address[] connectorPlugs;
//     bool[] isValid;

//     function setUp() external {
//         vm.pauseGasMetering();

//         _admin = address(uint160(_c++));
//         _raju = address(uint160(_c++));
//         _ramu = address(uint160(_c++));

//         _chainSlug = uint32(_c++);
//         _fastSwitchboard = address(uint160(_c++));

//         _otherChainSlug = uint32(_c++);
//         _otherFastSwitchboard = address(uint160(_c++));

//         vm.startPrank(_admin);

//         socket__ = new MockSocket();
//         executionHelper__ = new ExecutionHelper(_admin);

//         _setupVault();
//         _setupController();

//         _connectPlugs(
//             fastControllerConnector__,
//             _otherChainSlug,
//             address(fastVaultConnector__),
//             _otherFastSwitchboard
//         );
//         _connectPlugs(
//             fastVaultConnector__,
//             _chainSlug,
//             address(fastControllerConnector__),
//             _fastSwitchboard
//         );

//         vm.stopPrank();
//     }

//     function _setupVault() internal {
//         token__ = new MintableToken("Moon", "MOON", 18);
//         strategy__ = new MockStrategy(address(token__));
//         vault__ = new Vault(address(token__));
//         vaultHook__ = new MockYieldBridgeHook(
//             DEBT_RATIO,
//             REBALANCE_DELAY,
//             address(strategy__),
//             address(token__),
//             address(vault__),
//             address(executionHelper__)
//         );
//         fastVaultConnector__ = new ConnectorPlug(
//             address(vault__),
//             address(socket__),
//             _otherChainSlug
//         );

//         connectorPlugs.push(address(fastVaultConnector__));
//         isValid.push(true);
//         vault__.updateConnectorStatus(connectorPlugs, isValid);
//         vault__.updateHook(address(vaultHook__), true);
//         _setLimits(address(vaultHook__), address(fastVaultConnector__));
//     }

//     function _setupController() internal {
//         yieldToken__ = new YieldToken("Moon", "MOON", 18);
//         controller__ = new Controller(address(yieldToken__));
//         controllerHook__ = new MockYieldTokenHook(
//             address(yieldToken__),
//             address(controller__),
//             address(executionHelper__)
//         );
//         fastControllerConnector__ = new ConnectorPlug(
//             address(controller__),
//             address(socket__),
//             _chainSlug
//         );

//         // set pool id
//         connectors.push(address(fastControllerConnector__));
//         poolIds.push(_connectorPoolId);
//         controllerHook__.updateConnectorPoolId(connectors, poolIds);

//         // set connector status
//         connectorPlugs.pop();
//         isValid.pop();
//         connectorPlugs.push(address(fastControllerConnector__));
//         isValid.push(true);
//         controller__.updateConnectorStatus(connectorPlugs, isValid);

//         // set hook and roles
//         controller__.updateHook(address(controllerHook__), false);
//         yieldToken__.grantRole(MINTER_ROLE, address(controller__));
//         yieldToken__.grantRole(HOOK_ROLE, address(controllerHook__));

//         _setLimits(
//             address(controllerHook__),
//             address(fastControllerConnector__)
//         );
//     }

//     function _connectPlugs(
//         ConnectorPlug plug,
//         uint32 slug,
//         address siblingPlug,
//         address plugSwitchboard
//     ) internal {
//         socket__.setLocalSlug(slug);
//         plug.connect(siblingPlug, plugSwitchboard);
//     }

//     function _setLimits(address hook, address connector) internal {
//         LimitExecutionHook(hook).grantRole(LIMIT_UPDATER_ROLE, _admin);

//         UpdateLimitParams[] memory u = new UpdateLimitParams[](8);
//         u[0] = UpdateLimitParams(true, connector, FAST_MAX_LIMIT, FAST_RATE);
//         u[1] = UpdateLimitParams(false, connector, FAST_MAX_LIMIT, FAST_RATE);

//         LimitExecutionHook(hook).updateLimitParams(u);
//         skip(BOOTSTRAP_TIME);
//     }

//     function _beforeDeposit(uint256 amount, address to) internal {
//         vm.prank(_admin);
//         token__.mint(to, amount);
//     }

//     function _deposit(
//         uint256 depositAmount,
//         uint32 chainSlug,
//         address depositor,
//         address receiver
//     ) internal {
//         vm.startPrank(depositor);
//         token__.approve(address(vault__), depositAmount);
//         socket__.setLocalSlug(chainSlug);
//         vault__.bridge(
//             receiver,
//             depositAmount,
//             MSG_GAS_LIMIT,
//             address(fastVaultConnector__),
//             bytes(""),
//             bytes("")
//         );
//         vm.stopPrank();
//     }

//     function _beforeWithdraw(
//         uint256 amount,
//         address to,
//         uint32 chainSlug,
//         address receiver
//     ) internal {
//         _beforeDeposit(amount, to);
//         _deposit(amount, chainSlug, to, receiver);
//     }

//     function _withdraw(
//         uint256 withdrawAmount,
//         uint32 chainSlug,
//         address withdrawer,
//         address receiver,
//         bool pullFromStrategy_
//     ) internal {
//         vm.startPrank(withdrawer);
//         socket__.setLocalSlug(chainSlug);
//         controller__.bridge(
//             receiver,
//             withdrawAmount,
//             MSG_GAS_LIMIT,
//             address(fastControllerConnector__),
//             bytes(""),
//             abi.encode(pullFromStrategy_)
//         );
//         vm.stopPrank();
//     }

//     function _updateSiblingYield(uint256 amount_) internal {
//         controllerHook__.updateSiblingYield(_connectorPoolId, amount_);
//     }

//     function _updateTotalYield(uint256 amount_) internal {
//         controllerHook__.updateTotalYield(amount_);
//     }
// }

// contract TestYieldBridge is SetupYieldBridge {
//     // deposits
//     function testFirstDeposit() external {
//         uint256 depositAmount = 100;

//         _beforeDeposit(depositAmount, _raju);
//         uint256 rajuBalBefore = token__.balanceOf(_raju);
//         uint256 ramuBalBefore = yieldToken__.balanceOf(_ramu);
//         uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();
//         uint256 tokenSupplyBefore = yieldToken__.totalSupply();

//         assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

//         _deposit(depositAmount, _chainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = token__.balanceOf(_raju);
//         uint256 ramuBalAfter = yieldToken__.balanceOf(_ramu);
//         uint256 vaultBalAfter = vaultHook__.totalUnderlyingAssets();
//         uint256 tokenSupplyAfter = yieldToken__.totalSupply();

//         assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore + depositAmount,
//             "SuperTokenVault bal sus"
//         );
//         assertEq(
//             tokenSupplyAfter,
//             tokenSupplyBefore + depositAmount,
//             "token supply sus"
//         );
//     }

//     function testSecondDepositWithConstantYield() external {
//         // first deposit
//         uint256 initialDepositAmount = 10;
//         _beforeDeposit(initialDepositAmount, _raju);
//         _deposit(initialDepositAmount, _chainSlug, _raju, _ramu);

//         uint256 depositAmount = 20;
//         _beforeDeposit(depositAmount, _raju);
//         uint256 rajuBalBefore = token__.balanceOf(_raju);
//         uint256 ramuBalBefore = yieldToken__.balanceOf(_ramu);
//         uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();
//         uint256 tokenSupplyBefore = yieldToken__.totalSupply();

//         assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");
//         _deposit(depositAmount, _chainSlug, _raju, _ramu);

//         uint256 rajuBalAfter = token__.balanceOf(_raju);
//         uint256 ramuBalAfter = yieldToken__.balanceOf(_ramu);
//         uint256 vaultBalAfter = vaultHook__.totalUnderlyingAssets();
//         uint256 tokenSupplyAfter = yieldToken__.totalSupply();

//         assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore + depositAmount,
//             "SuperTokenVault bal sus"
//         );
//         assertEq(
//             tokenSupplyAfter,
//             tokenSupplyBefore + depositAmount,
//             "token supply sus"
//         );
//     }

//     function testSecondDepositWithIncreasedYield() external {
//         uint256 initialDepositAmount = 100;
//         _beforeDeposit(initialDepositAmount, _raju);
//         _deposit(initialDepositAmount, _chainSlug, _raju, _raju);

//         uint256 withdrawAmount = 50;
//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _raju, true);

//         // add 10% yield
//         uint256 strategyYield = 100;
//         _beforeDeposit(strategyYield, address(strategy__));
//         _deposit(0, _chainSlug, _raju, _raju);

//         uint256 ramuDepositAmount = 50;
//         _beforeDeposit(ramuDepositAmount, _ramu);

//         uint256 ramuInitialBalance = token__.balanceOf(_ramu);
//         _deposit(ramuDepositAmount, _chainSlug, _ramu, _ramu);

//         withdrawAmount = yieldToken__.balanceOf(_ramu);
//         _withdraw(withdrawAmount, _otherChainSlug, _ramu, _ramu, true);

//         uint256 ramuFinalBalance = token__.balanceOf(_ramu);

//         assertEq(ramuInitialBalance, ramuFinalBalance);
//     }

//     // todo
//     // function testSecondDepositWithDecreasedYield() external {
//     //     uint256 depositAmount = 100;

//     //     _beforeDeposit(depositAmount, _raju);
//     //     _deposit(depositAmount, _chainSlug, _raju, _raju);

//     //     uint256 rajuBalBefore = token__.balanceOf(_raju);
//     //     uint256 ramuBalBefore = yieldToken__.balanceOf(_ramu);
//     //     uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();
//     //     uint256 tokenSupplyBefore = yieldToken__.totalSupply();

//     //     assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

//     // }

//     // withdraws
//     function testWithdrawWithNoYieldChange() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = 50;

//         _beforeDeposit(depositAmount, _raju);
//         _deposit(depositAmount, _chainSlug, _raju, _raju);

//         uint256 rajuBalBefore = yieldToken__.balanceOf(_raju);
//         uint256 ramuBalBefore = token__.balanceOf(_ramu);
//         uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();
//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _ramu, true);

//         uint256 rajuBalAfter = yieldToken__.balanceOf(_raju);
//         uint256 ramuBalAfter = token__.balanceOf(_ramu);
//         uint256 vaultBalAfter = vaultHook__.totalUnderlyingAssets();

//         assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore - withdrawAmount,
//             "SuperTokenVault bal sus"
//         );
//     }

//     function testWithdrawAll() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = depositAmount;
//         bool pullFromStrategy = true;

//         _beforeDeposit(depositAmount, _raju);
//         _deposit(depositAmount, _chainSlug, _raju, _raju);

//         uint256 rajuBalBefore = yieldToken__.balanceOf(_raju);
//         uint256 ramuBalBefore = token__.balanceOf(_ramu);
//         uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();
//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");

//         _withdraw(
//             withdrawAmount,
//             _otherChainSlug,
//             _raju,
//             _ramu,
//             pullFromStrategy
//         );

//         // uint256 rajuBalAfter = yieldToken__.balanceOf(_raju);
//         // uint256 ramuBalAfter = token__.balanceOf(_ramu);
//         // uint256 vaultBalAfter = vaultHook__.totalUnderlyingAssets();

//         // assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         // assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");
//         // assertEq(
//         //     vaultBalAfter,
//         //     vaultBalBefore - withdrawAmount,
//         //     "SuperTokenVault bal sus"
//         // );
//     }

//     function testWithdrawWithIncreasedYield() external {
//         uint256 depositAmount = 100;
//         uint256 withdrawAmount = 50;

//         _beforeWithdraw(depositAmount, _raju, _chainSlug, _raju);

//         uint256 strategyYield = 10;
//         _beforeDeposit(strategyYield, address(strategy__));
//         _deposit(0, _chainSlug, address(0), _raju);

//         uint256 rajuBalBefore = yieldToken__.balanceOf(_raju);
//         uint256 ramuBalBefore = token__.balanceOf(_ramu);
//         uint256 vaultBalBefore = vaultHook__.totalUnderlyingAssets();

//         assertTrue(rajuBalBefore >= withdrawAmount, "Raju got no balance");
//         _withdraw(withdrawAmount, _otherChainSlug, _raju, _ramu, true);

//         uint256 rajuBalAfter = yieldToken__.balanceOf(_raju);
//         uint256 ramuBalAfter = token__.balanceOf(_ramu);
//         uint256 vaultBalAfter = vaultHook__.totalUnderlyingAssets();

//         assertEq(rajuBalAfter, rajuBalBefore - withdrawAmount, "Raju bal sus");
//         assertEq(ramuBalAfter, ramuBalBefore + withdrawAmount, "Ramu bal sus");

//         assertEq(
//             vaultBalAfter,
//             vaultBalBefore - withdrawAmount,
//             "SuperTokenVault bal sus"
//         );
//     }

//     // todo
//     // function testWithdrawWithDecreasedYield() external {}

//     // admin
//     function testDisconnectSocket() external {
//         hoax(_admin);
//         fastVaultConnector__.disconnect();

//         uint256 depositAmount = 100;
//         token__.mint(_raju, depositAmount);

//         vm.startPrank(_raju);
//         token__.approve(address(vault__), depositAmount);

//         vm.expectRevert();
//         vault__.bridge(
//             _raju,
//             depositAmount,
//             MSG_GAS_LIMIT,
//             address(fastVaultConnector__),
//             bytes(""),
//             bytes("")
//         );
//         vm.stopPrank();
//     }
// }
