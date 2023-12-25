pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
import "../mocks/NonMintableToken.sol";

import "../../contracts/supertoken/SuperPlug.sol";
import "../../contracts/supertoken/SuperToken.sol";
import "../../contracts/supertoken/SuperTokenLocker.sol";
import "../mocks/MockSocket.sol";

contract TestAppChainToken is Test {
    MockSocket _socket;
    uint256 _c;
    address _admin;
    address _raju;
    address _ramu;

    uint32 chainSlug;
    uint32 otherChainSlug;
    uint32 optChainSlug;
    uint32 arbChainSlug;

    address switchboard;

    SuperToken superToken;
    SuperToken otherSuperToken;

    MintableToken notSuperTokenArb;
    MintableToken notSuperTokenOpt;

    SuperTokenLocker arbLocker;
    SuperTokenLocker optLocker;

    uint256 public constant FAST_MAX_LIMIT = 100;
    uint256 public constant FAST_RATE = 1;
    uint256 public constant SLOW_MAX_LIMIT = 500;
    uint256 public constant SLOW_RATE = 2;
    uint256 public constant MSG_GAS_LIMIT = 200_000;
    uint256 public constant BOOTSTRAP_TIME = 250;

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

        notSuperTokenArb = new MintableToken("Moon", "MOON", 18);
        notSuperTokenOpt = new MintableToken("Moon", "MOON", 18);
        superToken = new SuperToken(
            "Moon",
            "MOON",
            18,
            _admin,
            _admin,
            100000,
            address(_socket)
        );

        otherSuperToken = new SuperToken(
            "Moon",
            "MOON",
            18,
            _admin,
            _admin,
            100000,
            address(_socket)
        );

        arbLocker = new SuperTokenLocker(
            address(notSuperTokenArb),
            address(_socket),
            _admin
        );
        optLocker = new SuperTokenLocker(
            address(notSuperTokenOpt),
            address(_socket),
            _admin
        );

        _connectPlugs(
            superToken,
            chainSlug,
            arbChainSlug,
            address(arbLocker),
            switchboard
        );
        _connectPlugs(
            superToken,
            chainSlug,
            optChainSlug,
            address(optLocker),
            switchboard
        );
        _connectPlugs(
            arbLocker,
            arbChainSlug,
            chainSlug,
            address(superToken),
            switchboard
        );
        _connectPlugs(
            optLocker,
            optChainSlug,
            chainSlug,
            address(superToken),
            switchboard
        );
        _connectPlugs(
            otherSuperToken,
            otherChainSlug,
            chainSlug,
            address(superToken),
            switchboard
        );
        _connectPlugs(
            superToken,
            chainSlug,
            otherChainSlug,
            address(otherSuperToken),
            switchboard
        );

        _setTokenLimits(superToken, arbChainSlug);
        _setTokenLimits(superToken, optChainSlug);
        _setTokenLimits(superToken, otherChainSlug);
        _setTokenLimits(otherSuperToken, chainSlug);

        _setLockerLimits(arbLocker, chainSlug);
        _setLockerLimits(optLocker, chainSlug);

        vm.stopPrank();
    }

    function _connectPlugs(
        SuperPlug plug,
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

    function _setTokenLimits(SuperToken token, uint32 siblingSlug) internal {
        SuperToken.UpdateLimitParams[]
            memory u = new SuperToken.UpdateLimitParams[](4);
        u[0] = SuperToken.UpdateLimitParams(
            true,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = SuperToken.UpdateLimitParams(
            false,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        token.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function _setLockerLimits(
        SuperTokenLocker locker,
        uint32 siblingSlug
    ) internal {
        SuperTokenLocker.UpdateLimitParams[]
            memory u = new SuperTokenLocker.UpdateLimitParams[](8);
        u[0] = SuperTokenLocker.UpdateLimitParams(
            true,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );
        u[1] = SuperTokenLocker.UpdateLimitParams(
            false,
            siblingSlug,
            FAST_MAX_LIMIT,
            FAST_RATE
        );

        locker.updateLimitParams(u);
        skip(BOOTSTRAP_TIME);
    }

    function testSuperTokenLockerToSuperTokenDeposit() external {
        uint256 depositAmount = 44;

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
        arbLocker.bridge(_ramu, chainSlug, depositAmount, MSG_GAS_LIMIT);

        uint256 rajuBalAfter = notSuperTokenArb.balanceOf(_raju);
        uint256 ramuBalAfter = superToken.balanceOf(_ramu);
        uint256 vaultBalAfter = notSuperTokenArb.balanceOf(address(arbLocker));
        uint256 tokenSupplyAfter = superToken.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "SuperTokenLocker bal sus"
        );
        assertEq(
            tokenSupplyAfter,
            tokenSupplyBefore + depositAmount,
            "token supply sus"
        );
    }

    function testSuperTokenToSuperTokenLockerDeposit() external {
        uint256 depositAmount = 44;

        vm.prank(_admin);
        superToken.transfer(_raju, depositAmount);
        notSuperTokenArb.mint(address(arbLocker), depositAmount);

        uint256 rajuBalBefore = superToken.balanceOf(_raju);
        uint256 ramuBalBefore = notSuperTokenArb.balanceOf(_ramu);
        uint256 totalSupplyBefore = superToken.totalSupply();
        uint256 vaultBalBefore = notSuperTokenArb.balanceOf(address(arbLocker));

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        _socket.setLocalSlug(chainSlug);
        superToken.bridge(_ramu, arbChainSlug, depositAmount, MSG_GAS_LIMIT);

        uint256 rajuBalAfter = superToken.balanceOf(_raju);
        uint256 ramuBalAfter = notSuperTokenArb.balanceOf(_ramu);
        uint256 totalSupplyAfter = superToken.totalSupply();
        uint256 vaultBalAfter = notSuperTokenArb.balanceOf(address(arbLocker));

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            vaultBalAfter,
            vaultBalBefore - depositAmount,
            "SuperTokenLocker bal sus"
        );
        assertEq(
            totalSupplyAfter,
            totalSupplyBefore - depositAmount,
            "token supply sus"
        );
    }

    function testSuperTokenToOtherSuperTokenDeposit() external {
        uint256 depositAmount = 44;

        vm.prank(_admin);
        superToken.transfer(_raju, depositAmount);

        uint256 rajuBalBefore = superToken.balanceOf(_raju);
        uint256 ramuBalBefore = otherSuperToken.balanceOf(_ramu);
        uint256 token1SupplyBefore = superToken.totalSupply();
        uint256 token2SupplyBefore = otherSuperToken.totalSupply();

        assertTrue(rajuBalBefore >= depositAmount, "Raju got no balance");

        vm.startPrank(_raju);
        _socket.setLocalSlug(chainSlug);
        superToken.bridge(_ramu, otherChainSlug, depositAmount, MSG_GAS_LIMIT);

        uint256 rajuBalAfter = superToken.balanceOf(_raju);
        uint256 ramuBalAfter = otherSuperToken.balanceOf(_ramu);
        uint256 token1SupplyAfter = superToken.totalSupply();
        uint256 token2SupplyAfter = otherSuperToken.totalSupply();

        assertEq(rajuBalAfter, rajuBalBefore - depositAmount, "Raju bal sus");
        assertEq(ramuBalAfter, ramuBalBefore + depositAmount, "Ramu bal sus");
        assertEq(
            token1SupplyAfter,
            token1SupplyBefore - depositAmount,
            "token1 bal sus"
        );
        assertEq(
            token2SupplyAfter,
            token2SupplyBefore + depositAmount,
            "token2 supply sus"
        );
    }

    function testDisconnect() external {
        hoax(_admin);
        superToken.disconnect(arbChainSlug);

        uint256 depositAmount = 100;
        vm.prank(_admin);
        superToken.transfer(_raju, depositAmount);

        vm.startPrank(_raju);
        superToken.approve(address(arbLocker), depositAmount);

        vm.expectRevert(SuperTokenLocker.SiblingChainSlugUnavailable.selector);
        arbLocker.bridge(_ramu, arbChainSlug, depositAmount, MSG_GAS_LIMIT);
    }
}
