pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../../mocks/MintableToken.sol";
import "../../mocks/NonMintableToken.sol";

import "../../../contracts/supertoken/plugs/SocketPlug.sol";
import "../../../contracts/supertoken/SuperTokenWithExecutionPayload.sol";
import "../../../contracts/supertoken/SuperTokenVaultWithExecutionPayload.sol";
import "../../mocks/MockSocket.sol";
import "../../mocks/MockExecutableReceiver.sol";

// bridge with a failing payload, should transfer and fail execution, cache payload, should be able to retry, is success clear else let it be stored

contract TestExecute is Test {
    uint256 _c;
    address _admin;
    address _raju;
    address _ramu;

    uint32 chainSlug;
    uint32 otherChainSlug;
    uint32 optChainSlug;
    uint32 arbChainSlug;

    address switchboard;

    MockSocket _socket;
    ExecutionHelperPlugin _executionHelper;

    SocketPlug superTokenPlug;
    SuperTokenWithExecutionPayload superToken;

    SocketPlug otherSuperTokenPlug;
    SuperTokenWithExecutionPayload otherSuperToken;

    MintableToken notSuperTokenArb;

    SocketPlug arbLockerPlug;
    SuperTokenVaultWithExecutionPayload arbLocker;

    MockExecutableReceiver executableReceiver;

    uint256 public constant FAST_MAX_LIMIT = 100;
    uint256 public constant FAST_RATE = 1;
    uint256 public constant SLOW_MAX_LIMIT = 500;
    uint256 public constant SLOW_RATE = 2;
    uint256 public constant MSG_GAS_LIMIT = 200_000;
    uint256 public constant BOOTSTRAP_TIME = 250;
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

    function setUp() external {
        _admin = address(uint160(_c++));
        _raju = address(uint160(_c++));
        _ramu = address(uint160(_c++));

        chainSlug = uint32(_c++);
        otherChainSlug = uint32(_c++);

        optChainSlug = uint32(_c++);
        arbChainSlug = uint32(_c++);

        switchboard = address(uint160(_c++));

        vm.startPrank(_admin);

        _socket = new MockSocket();
        _executionHelper = new ExecutionHelperPlugin();

        notSuperTokenArb = new MintableToken("Moon", "MOON", 18);

        superTokenPlug = new SocketPlug(address(_socket), _admin, chainSlug);
        superToken = new SuperTokenWithExecutionPayload(
            "Moon",
            "MOON",
            18,
            _admin,
            _admin,
            100000,
            address(superTokenPlug),
            address(_executionHelper)
        );
        superTokenPlug.setSuperTokenOrVault(address(superToken));
        executableReceiver = new MockExecutableReceiver(
            _ramu,
            address(superToken)
        );

        otherSuperTokenPlug = new SocketPlug(
            address(_socket),
            _admin,
            otherChainSlug
        );
        otherSuperToken = new SuperTokenWithExecutionPayload(
            "Moon",
            "MOON",
            18,
            _admin,
            _admin,
            100000,
            address(otherSuperTokenPlug),
            address(_executionHelper)
        );
        otherSuperTokenPlug.setSuperTokenOrVault(address(otherSuperToken));

        arbLockerPlug = new SocketPlug(address(_socket), _admin, arbChainSlug);
        arbLocker = new SuperTokenVaultWithExecutionPayload(
            address(notSuperTokenArb),
            _admin,
            address(arbLockerPlug),
            address(_executionHelper)
        );
        arbLockerPlug.setSuperTokenOrVault(address(arbLocker));

        _connectPlugs(
            superTokenPlug,
            chainSlug,
            arbChainSlug,
            address(arbLockerPlug),
            switchboard
        );
        _connectPlugs(
            arbLockerPlug,
            arbChainSlug,
            chainSlug,
            address(superTokenPlug),
            switchboard
        );
        _connectPlugs(
            otherSuperTokenPlug,
            otherChainSlug,
            chainSlug,
            address(superTokenPlug),
            switchboard
        );
        _connectPlugs(
            superTokenPlug,
            chainSlug,
            otherChainSlug,
            address(otherSuperTokenPlug),
            switchboard
        );

        _setTokenLimits(superToken, arbChainSlug);
        _setTokenLimits(superToken, optChainSlug);
        _setTokenLimits(superToken, otherChainSlug);
        _setTokenLimits(otherSuperToken, chainSlug);
        _setLockerLimits(arbLocker, chainSlug);

        vm.stopPrank();
    }

    function _connectPlugs(
        SocketPlug plug,
        uint32 slug,
        uint32 siblingSlug,
        address siblingPlug,
        address plugSwitchboard
    ) internal {
        _socket.setLocalSlug(slug);
        plug.connect(
            siblingSlug,
            siblingPlug,
            plugSwitchboard,
            plugSwitchboard
        );
    }

    function _setTokenLimits(
        SuperTokenWithExecutionPayload token,
        uint32 siblingSlug
    ) internal {
        token.grantRole(LIMIT_UPDATER_ROLE, _admin);

        SuperTokenWithExecutionPayload.UpdateLimitParams[]
            memory u = new SuperTokenWithExecutionPayload.UpdateLimitParams[](
                4
            );
        u[0] = SuperTokenWithExecutionPayload.UpdateLimitParams(
            true,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = SuperTokenWithExecutionPayload.UpdateLimitParams(
            false,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        token.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function _setLockerLimits(
        SuperTokenVaultWithExecutionPayload locker,
        uint32 siblingSlug
    ) internal {
        locker.grantRole(LIMIT_UPDATER_ROLE, _admin);

        SuperTokenVaultWithExecutionPayload.UpdateLimitParams[]
            memory u = new SuperTokenVaultWithExecutionPayload.UpdateLimitParams[](
                8
            );
        u[0] = SuperTokenVaultWithExecutionPayload.UpdateLimitParams(
            true,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = SuperTokenVaultWithExecutionPayload.UpdateLimitParams(
            false,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );

        locker.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function testExecutablePayloadWithDeposit() external {
        uint256 depositAmount = 44;
        bytes memory payloadToExecute = abi.encodeWithSelector(
            MockExecutableReceiver.transferFundsToAdmin.selector,
            depositAmount
        );

        vm.prank(_admin);
        notSuperTokenArb.mint(_raju, depositAmount);

        uint256 rajuBalBefore = notSuperTokenArb.balanceOf(_raju);
        uint256 ramuBalBefore = superToken.balanceOf(_ramu);
        uint256 vaultBalBefore = notSuperTokenArb.balanceOf(address(arbLocker));
        uint256 tokenSupplyBefore = superToken.totalSupply();

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        notSuperTokenArb.approve(address(arbLocker), depositAmount);
        _socket.setLocalSlug(arbChainSlug);
        arbLocker.bridge(
            address(executableReceiver),
            chainSlug,
            depositAmount,
            MSG_GAS_LIMIT,
            payloadToExecute,
            bytes("")
        );

        uint256 rajuBalAfter = notSuperTokenArb.balanceOf(_raju);
        uint256 ramuBalAfter = superToken.balanceOf(_ramu);
        uint256 vaultBalAfter = notSuperTokenArb.balanceOf(address(arbLocker));
        uint256 tokenSupplyAfter = superToken.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "SuperTokenVault bal sus"
        );
        assertEq(
            tokenSupplyAfter,
            tokenSupplyBefore + depositAmount,
            "token supply sus"
        );
    }

    function testCacheExecutablePayloadWithDeposit() external {
        uint256 depositAmount = 55;
        bytes memory payloadToExecute = abi.encodeWithSelector(
            MockExecutableReceiver.transferFundsToAdmin.selector,
            depositAmount
        );

        vm.prank(_admin);
        notSuperTokenArb.mint(_raju, depositAmount);

        uint256 rajuBalBefore = notSuperTokenArb.balanceOf(_raju);
        uint256 vaultBalBefore = notSuperTokenArb.balanceOf(address(arbLocker));
        uint256 tokenSupplyBefore = superToken.totalSupply();

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        notSuperTokenArb.approve(address(arbLocker), depositAmount);
        _socket.setLocalSlug(arbChainSlug);
        arbLocker.bridge(
            address(executableReceiver),
            chainSlug,
            depositAmount,
            MSG_GAS_LIMIT,
            payloadToExecute,
            bytes("")
        );

        bytes32 messageId = bytes32(
            (uint256(arbChainSlug) << 224) |
                (uint256(uint160(address(superTokenPlug))) << 64) |
                0
        );
        (
            bool isAmountPending,
            ,
            address receiver,
            bytes memory payload
        ) = superToken.pendingExecutions(messageId);

        assertEq(
            receiver,
            address(executableReceiver),
            "Wrong receiver cached"
        );
        assertEq(payload, payloadToExecute, "Wrong payload cached");
        assertFalse(isAmountPending, "Amount not transferred");

        uint256 rajuBalAfter = notSuperTokenArb.balanceOf(_raju);
        uint256 vaultBalAfter = notSuperTokenArb.balanceOf(address(arbLocker));
        uint256 tokenSupplyAfter = superToken.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "SuperTokenVault bal sus"
        );
        assertEq(
            tokenSupplyAfter,
            tokenSupplyBefore + depositAmount,
            "token supply sus"
        );
    }

    function testRetryCachedExecutablePayload() external {
        uint256 depositAmount = 55;
        bytes memory payloadToExecute = abi.encodeWithSelector(
            MockExecutableReceiver.transferFundsToAdmin.selector,
            depositAmount
        );

        vm.prank(_admin);
        notSuperTokenArb.mint(_raju, depositAmount);

        vm.startPrank(_raju);
        notSuperTokenArb.approve(address(arbLocker), depositAmount);
        _socket.setLocalSlug(arbChainSlug);
        arbLocker.bridge(
            address(executableReceiver),
            chainSlug,
            depositAmount,
            MSG_GAS_LIMIT,
            payloadToExecute,
            bytes("")
        );

        bytes32 messageId = bytes32(
            (uint256(arbChainSlug) << 224) |
                (uint256(uint160(address(superTokenPlug))) << 64) |
                0
        );
        (, , address receiver, ) = superToken.pendingExecutions(messageId);

        assertEq(
            receiver,
            address(executableReceiver),
            "Wrong receiver cached"
        );

        executableReceiver.incrementCounter();
        superToken.retryPayloadExecution(messageId);

        (
            bool isAmountPending,
            uint32 siblingSlug,
            address receiverAfterRetry,
            bytes memory payload
        ) = superToken.pendingExecutions(messageId);
        assertEq(receiverAfterRetry, address(0), "receiver not cleared");
        assertEq(payload, bytes(""), "payload not cleared");
        assertEq(siblingSlug, 0, "siblingSlug not cleared");
        assertFalse(isAmountPending, "isAmountPending not cleared");
    }
}
