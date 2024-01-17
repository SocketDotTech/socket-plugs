pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";

import "../../contracts/supertoken/plugs/SocketPlug.sol";
import "../../contracts/supertoken/SuperTokenVault.sol";

contract TestSuperTokenVaultLimits is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));

    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRate = 2 ether;
    uint256 constant _unlockMaxLimit = 100 ether;
    uint256 constant _unlockRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    uint256 constant _rajuInitialBal = 1000;
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    MintableToken _token;
    SuperTokenVault _locker;
    SocketPlug _lockerPlug;
    address _socket;

    uint32 _siblingSlug;
    uint32 _siblingSlug1;
    uint32 _siblingSlug2;

    function setUp() external {
        vm.startPrank(_admin);

        _socket = address(uint160(_c++));
        _siblingSlug = uint32(_c++);
        _siblingSlug1 = uint32(_c++);
        _siblingSlug2 = uint32(_c++);

        _token = new MintableToken("Moon", "MOON", 18);

        _lockerPlug = new SocketPlug(address(_socket), _admin, _siblingSlug);
        _locker = new SuperTokenVault(
            address(_token),
            _admin,
            address(_lockerPlug)
        );
        _lockerPlug.setSuperToken(address(_locker));

        _token.mint(_raju, _rajuInitialBal);

        vm.stopPrank();
    }

    function _setLimits() internal {
        SuperTokenVault.UpdateLimitParams[]
            memory u = new SuperTokenVault.UpdateLimitParams[](4);
        u[0] = SuperTokenVault.UpdateLimitParams(
            false,
            _siblingSlug1,
            _unlockMaxLimit,
            _unlockRate
        );
        u[1] = SuperTokenVault.UpdateLimitParams(
            true,
            _siblingSlug1,
            _lockMaxLimit,
            _lockRate
        );

        u[2] = SuperTokenVault.UpdateLimitParams(
            false,
            _siblingSlug2,
            _unlockMaxLimit,
            _unlockRate
        );
        u[3] = SuperTokenVault.UpdateLimitParams(
            true,
            _siblingSlug2,
            _lockMaxLimit,
            _lockRate
        );

        vm.prank(_admin);
        _locker.grantRole(LIMIT_UPDATER_ROLE, _admin);
        vm.prank(_admin);
        _locker.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        SuperTokenVault.LimitParams memory burnLimitParams = _locker
            .getLockLimitParams(_siblingSlug1);
        SuperTokenVault.LimitParams memory unlockLimitParams = _locker
            .getUnlockLimitParams(_siblingSlug1);

        assertEq(
            burnLimitParams.maxLimit,
            _lockMaxLimit,
            "burn max limit not updated"
        );
        assertEq(
            burnLimitParams.ratePerSecond,
            _lockRate,
            "burn rate not updated"
        );

        assertEq(
            unlockLimitParams.maxLimit,
            _unlockMaxLimit,
            "unlock max limit not updated"
        );
        assertEq(
            unlockLimitParams.ratePerSecond,
            _unlockRate,
            "unlock rate not updated"
        );
    }

    function testUpdateLimitParamsRaju() external {
        SuperTokenVault.UpdateLimitParams[]
            memory u = new SuperTokenVault.UpdateLimitParams[](2);
        u[0] = SuperTokenVault.UpdateLimitParams(
            true,
            _siblingSlug1,
            _unlockMaxLimit,
            _unlockRate
        );
        u[1] = SuperTokenVault.UpdateLimitParams(
            false,
            _siblingSlug1,
            _lockMaxLimit,
            _lockRate
        );

        vm.prank(_raju);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.NoPermit.selector,
                LIMIT_UPDATER_ROLE
            )
        );
        _locker.updateLimitParams(u);
    }

    function testDepositLimitHit() external {
        uint256 depositAmount = 201 ether;
        _setLimits();
        assertTrue(
            depositAmount > _locker.getCurrentLockLimit(_siblingSlug1),
            "deposit amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, depositAmount, true);
        deal(_raju, _fees);

        vm.startPrank(_raju);

        _token.approve(address(_locker), depositAmount);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        _locker.bridge{value: _fees}(
            _raju,
            _siblingSlug1,
            depositAmount,
            _msgGasLimit,
            bytes("")
        );
        vm.stopPrank();
    }

    function testZeroAmountDeposit() external {
        _setLimits();

        uint256 depositAmount = 0 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(_raju);
        _token.approve(address(_locker), depositAmount);

        vm.expectRevert(SuperTokenVault.ZeroAmount.selector);
        _locker.bridge{value: _fees}(
            _raju,
            _siblingSlug1,
            depositAmount,
            _msgGasLimit,
            bytes("")
        );
        vm.stopPrank();
    }

    function testDeposit() external {
        _setLimits();

        uint256 depositAmount = 10 ether;
        deal(address(_token), _raju, depositAmount);
        deal(_raju, _fees);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 vaultBalBefore = _token.balanceOf(address(_locker));
        uint256 lockLimitBefore = _locker.getCurrentLockLimit(_siblingSlug1);

        assertTrue(
            depositAmount <= _locker.getCurrentLockLimit(_siblingSlug1),
            "too big deposit"
        );

        vm.startPrank(_raju);
        _token.approve(address(_locker), depositAmount);

        bytes32 messageId = bytes32(
            (uint256(_siblingSlug) << 224) |
                (uint256(uint160(address(0))) << 64) |
                (0)
        );
        bytes memory payload = abi.encode(_raju, depositAmount, messageId);

        vm.mockCall(
            _socket,
            abi.encodeCall(ISocket.globalMessageCount, ()),
            abi.encode(0)
        );
        vm.mockCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            ),
            abi.encode(messageId)
        );
        vm.expectCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            )
        );
        _locker.bridge{value: _fees}(
            _raju,
            _siblingSlug1,
            depositAmount,
            _msgGasLimit,
            bytes("")
        );
        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 vaultBalAfter = _token.balanceOf(address(_locker));
        uint256 lockLimitAfter = _locker.getCurrentLockLimit(_siblingSlug1);

        assertEq(
            rajuBalAfter,
            rajuBalBefore - depositAmount,
            "raju balance sus"
        );
        assertEq(
            vaultBalAfter,
            vaultBalBefore + depositAmount,
            "vault balance sus"
        );
        assertEq(
            lockLimitAfter,
            lockLimitBefore - depositAmount,
            "lock limit sus"
        );
    }

    function testPartLockLimitReplenish() external {
        _setLimits();

        uint256 usedLimit = 30 ether;
        uint256 time = 10;
        deal(_raju, _fees);
        deal(address(_token), address(_locker), usedLimit, true);

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, usedLimit, bytes32(""))
        );

        bytes32 messageId = bytes32(
            (uint256(_siblingSlug) << 224) |
                (uint256(uint160(address(0))) << 64) |
                (0)
        );
        bytes memory payload = abi.encode(_raju, usedLimit, messageId);
        vm.startPrank(_raju);
        vm.mockCall(
            _socket,
            abi.encodeCall(ISocket.globalMessageCount, ()),
            abi.encode(0)
        );
        vm.mockCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            ),
            abi.encode(messageId)
        );
        vm.expectCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            )
        );

        _token.approve(address(_locker), usedLimit);
        _locker.bridge{value: _fees}(
            _raju,
            _siblingSlug1,
            usedLimit,
            _msgGasLimit,
            bytes("")
        );
        vm.stopPrank();

        uint256 lockLimitBefore = _locker.getCurrentLockLimit(_siblingSlug1);

        assertTrue(lockLimitBefore < _lockMaxLimit, "full limit avail");
        assertTrue(
            lockLimitBefore + time * _lockRate < _lockMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 lockLimitAfter = _locker.getCurrentLockLimit(_siblingSlug1);
        assertEq(
            lockLimitAfter,
            lockLimitBefore + time * _lockRate,
            "burn limit sus"
        );
    }

    function testFullLockLimitReplenish() external {
        _setLimits();

        uint256 usedLimit = 30 ether;
        uint256 time = 100;
        deal(_raju, _fees);
        deal(address(_token), address(_locker), usedLimit, true);

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, usedLimit, bytes32(""))
        );

        bytes32 messageId = bytes32(
            (uint256(_siblingSlug) << 224) |
                (uint256(uint160(address(0))) << 64) |
                (0)
        );
        bytes memory payload = abi.encode(_raju, usedLimit, messageId);
        vm.startPrank(_raju);
        vm.mockCall(
            _socket,
            abi.encodeCall(ISocket.globalMessageCount, ()),
            abi.encode(0)
        );
        vm.mockCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            ),
            abi.encode(messageId)
        );
        vm.expectCall(
            _socket,
            _fees,
            abi.encodeCall(
                ISocket.outbound,
                (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
            )
        );

        _token.approve(address(_locker), usedLimit);
        _locker.bridge{value: _fees}(
            _raju,
            _siblingSlug1,
            usedLimit,
            _msgGasLimit,
            bytes("")
        );
        vm.stopPrank();

        uint256 lockLimitBefore = _locker.getCurrentLockLimit(_siblingSlug1);

        assertTrue(lockLimitBefore < _lockMaxLimit, "full limit avail");
        assertTrue(
            lockLimitBefore + time * _lockRate > _lockMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 lockLimitAfter = _locker.getCurrentLockLimit(_siblingSlug1);
        assertEq(lockLimitAfter, _lockMaxLimit, "burn limit sus");
    }

    function testFullConsumeInboundReceive() external {
        _setLimits();
        uint256 withdrawAmount = 2 ether;
        deal(address(_token), address(_locker), withdrawAmount, true);

        uint256 vaultBalBefore = _token.balanceOf(address(_locker));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksBefore = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );
        uint256 unlockLimitBefore = _locker.getCurrentUnlockLimit(
            _siblingSlug1
        );

        assertTrue(withdrawAmount <= unlockLimitBefore, "limit hit");

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, withdrawAmount, bytes32(""))
        );

        uint256 vaultBalAfter = _token.balanceOf(address(_locker));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksAfter = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );
        uint256 unlockLimitAfter = _locker.getCurrentUnlockLimit(_siblingSlug1);

        assertEq(
            vaultBalAfter,
            vaultBalBefore - withdrawAmount,
            "total unlocked sus"
        );
        assertEq(
            rajuBalAfter,
            rajuBalBefore + withdrawAmount,
            "raju balance sus"
        );
        assertEq(
            pendingUnlocksAfter,
            pendingUnlocksBefore,
            "pending unlocks sus"
        );
        assertEq(
            siblingPendingUnlocksAfter,
            siblingPendingUnlocksBefore,
            "total pending amount sus"
        );
        assertEq(
            unlockLimitAfter,
            unlockLimitBefore - withdrawAmount,
            "unlock limit sus"
        );
    }

    function testPartConsumeInboundReceive() external {
        _setLimits();
        uint256 withdrawAmount = 110 ether;
        deal(address(_token), address(_locker), withdrawAmount, true);

        uint256 vaultBalBefore = _token.balanceOf(address(_locker));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksBefore = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );
        uint256 unlockLimitBefore = _locker.getCurrentUnlockLimit(
            _siblingSlug1
        );

        assertTrue(unlockLimitBefore > 0, "no unlock limit available");
        assertTrue(withdrawAmount > unlockLimitBefore, "unlock not partial");

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, withdrawAmount, bytes32(0))
        );

        uint256 vaultBalAfter = _token.balanceOf(address(_locker));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksAfter = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );
        uint256 unlockLimitAfter = _locker.getCurrentUnlockLimit(_siblingSlug1);

        assertEq(
            vaultBalAfter,
            vaultBalBefore - unlockLimitBefore,
            "total unlocked sus"
        );
        assertEq(
            rajuBalAfter,
            rajuBalBefore + unlockLimitBefore,
            "raju balance sus"
        );
        assertEq(
            pendingUnlocksAfter,
            pendingUnlocksBefore + withdrawAmount - unlockLimitBefore,
            "pending unlocks sus"
        );
        assertEq(
            siblingPendingUnlocksAfter,
            siblingPendingUnlocksBefore + withdrawAmount - unlockLimitBefore,
            "total pending amount sus"
        );
        assertEq(unlockLimitAfter, 0, "unlock limit sus");
    }

    function testPartUnlockLimitReplenish() external {
        _setLimits();

        uint256 usedLimit = 20 ether;
        uint256 time = 10;
        deal(address(_token), address(_locker), usedLimit, true);

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, usedLimit, bytes32(0))
        );

        uint256 unlockLimitBefore = _locker.getCurrentUnlockLimit(
            _siblingSlug1
        );

        assertTrue(unlockLimitBefore < _unlockMaxLimit, "full limit avail");
        assertTrue(
            unlockLimitBefore + time * _unlockRate < _unlockMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 unlockLimitAfter = _locker.getCurrentUnlockLimit(_siblingSlug1);
        assertEq(
            unlockLimitAfter,
            unlockLimitBefore + time * _unlockRate,
            "unlock limit sus"
        );
    }

    function testFullUnlockLimitReplenish() external {
        _setLimits();

        uint256 usedLimit = 20 ether;
        uint256 time = 100;
        deal(address(_token), address(_locker), usedLimit, true);
        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, usedLimit, bytes32(0))
        );

        uint256 unlockLimitBefore = _locker.getCurrentUnlockLimit(
            _siblingSlug1
        );

        assertTrue(unlockLimitBefore < _unlockMaxLimit, "full limit avail");
        assertTrue(
            unlockLimitBefore + time * _unlockRate > _unlockMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 unlockLimitAfter = _locker.getCurrentUnlockLimit(_siblingSlug1);
        assertEq(unlockLimitAfter, _unlockMaxLimit, "unlock limit sus");
    }

    function testFullConsumeUnlockPending1() external {
        _setLimits();

        uint256 withdrawAmount = 120 ether;
        uint256 time = 200;

        deal(address(_token), address(_locker), withdrawAmount, true);
        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, withdrawAmount, bytes32(0))
        );

        uint256 vaultBalBefore = _token.balanceOf(address(_locker));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksBefore = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );

        assertEq(
            vaultBalBefore,
            withdrawAmount - _unlockMaxLimit,
            "vault bal before sus"
        );
        assertEq(
            rajuBalBefore,
            _unlockMaxLimit + _rajuInitialBal,
            "raju bal before sus"
        );
        assertEq(
            pendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            siblingPendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(
            time * _unlockRate > withdrawAmount - _unlockMaxLimit,
            "not enough time"
        );

        skip(time);
        _locker.unlockPendingFor(_raju, _siblingSlug1);

        uint256 vaultBalAfter = _token.balanceOf(address(_locker));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksAfter = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );

        assertEq(vaultBalAfter, 0, "vault bal after sus");
        assertEq(
            rajuBalAfter,
            withdrawAmount + _rajuInitialBal,
            "raju bal after sus"
        );
        assertEq(pendingUnlocksAfter, 0, "pending unlock after sus");
        assertEq(
            siblingPendingUnlocksAfter,
            0,
            "total pending unlock after sus"
        );
    }

    function testPartConsumeMintPending() external {
        _setLimits();
        uint256 withdrawAmount = 120 ether;
        uint256 time = 5;
        deal(address(_token), address(_locker), withdrawAmount, true);

        vm.prank(address(_lockerPlug));
        _locker.inbound(
            _siblingSlug1,
            abi.encode(_raju, withdrawAmount, bytes32(0))
        );

        uint256 vaultBalBefore = _token.balanceOf(address(_locker));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksBefore = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );
        uint256 newUnlock = time * _unlockRate;

        assertEq(
            vaultBalBefore,
            withdrawAmount - _unlockMaxLimit,
            "total unlocked before sus"
        );
        assertEq(
            rajuBalBefore,
            _unlockMaxLimit + _rajuInitialBal,
            "raju bal before sus"
        );
        assertEq(
            pendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            siblingPendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(withdrawAmount - _unlockMaxLimit > 0, "what to unlock?");

        assertTrue(
            newUnlock < withdrawAmount - _unlockMaxLimit,
            "too much time"
        );

        skip(time);
        _locker.unlockPendingFor(_raju, _siblingSlug1);

        uint256 vaultBalAfter = _token.balanceOf(address(_locker));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _locker.pendingUnlocks(
            _siblingSlug1,
            _raju
        );
        uint256 siblingPendingUnlocksAfter = _locker.siblingPendingUnlocks(
            _siblingSlug1
        );

        assertEq(
            vaultBalAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "total unlocked after sus"
        );
        assertEq(
            rajuBalAfter,
            _unlockMaxLimit + newUnlock + _rajuInitialBal,
            "raju bal after sus"
        );
        assertEq(
            pendingUnlocksAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "pending unlock after sus"
        );
        assertEq(
            siblingPendingUnlocksAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "total pending unlock after sus"
        );
    }
}
