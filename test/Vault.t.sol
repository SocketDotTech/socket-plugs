pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../contracts/superbridge/NonMintableToken.sol";
import "../contracts/superbridge/ConnectorPlug.sol";
import "../contracts/superbridge/Vault.sol";

contract TestVault is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _wrongConnector = address(uint160(_c++));

    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRate = 2 ether;
    uint256 constant _unlockMaxLimit = 100 ether;
    uint256 constant _unlockRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    ERC20 _token;
    Vault _vault;

    function setUp() external {
        vm.startPrank(_admin);
        _token = new NonMintableToken("Moon", "MOON", 18, 1_000_000_000 ether);
        _vault = new Vault(address(_token));
        vm.stopPrank();
    }

    function _setLimits() internal {
        Vault.UpdateLimitParams[] memory u = new Vault.UpdateLimitParams[](2);
        u[0] = Vault.UpdateLimitParams(
            true,
            _connector,
            _lockMaxLimit,
            _lockRate
        );
        u[1] = Vault.UpdateLimitParams(
            false,
            _connector,
            _unlockMaxLimit,
            _unlockRate
        );

        vm.prank(_admin);
        _vault.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        Vault.LimitParams memory lockLimitParams = _vault.getLockLimitParams(
            _connector
        );
        Vault.LimitParams memory unlockLimitParams = _vault
            .getUnlockLimitParams(_connector);

        assertEq(
            lockLimitParams.maxLimit,
            _lockMaxLimit,
            "lock max limit not updated"
        );
        assertEq(
            lockLimitParams.ratePerSecond,
            _lockRate,
            "lock rate not updated"
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
        Vault.UpdateLimitParams[] memory u = new Vault.UpdateLimitParams[](2);
        u[0] = Vault.UpdateLimitParams(
            true,
            _connector,
            _lockMaxLimit,
            _lockRate
        );
        u[1] = Vault.UpdateLimitParams(
            false,
            _connector,
            _unlockMaxLimit,
            _unlockRate
        );

        vm.prank(_raju);
        vm.expectRevert("Ownable: caller is not the owner");
        _vault.updateLimitParams(u);
    }

    function testDepositConnectorUnavail() external {
        uint256 depositAmount = 2 ether;
        _setLimits();
        deal(_raju, _fees);
        vm.prank(_raju);
        vm.expectRevert(Vault.ConnectorUnavailable.selector);
        _vault.depositToAppChain{value: _fees}(
            _raju,
            depositAmount,
            _msgGasLimit,
            _wrongConnector
        );
    }

    function testDepositLimitHit() external {
        uint256 depositAmount = 201 ether;
        _setLimits();
        assertTrue(
            depositAmount > _vault.getCurrentLockLimit(_connector),
            "deposit amount within limit"
        );

        vm.prank(_admin);
        _token.transfer(_raju, depositAmount);
        deal(_raju, _fees);

        vm.startPrank(_raju);
        _token.approve(address(_vault), depositAmount);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        _vault.depositToAppChain{value: _fees}(
            _raju,
            depositAmount,
            _msgGasLimit,
            _connector
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
        _token.approve(address(_vault), dealAmount);
        vm.expectRevert(Vault.ZeroAmount.selector);
        _vault.depositToAppChain{value: _fees}(
            _raju,
            depositAmount,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();
    }

    function testDeposit() external {
        _setLimits();

        uint256 depositAmount = 10 ether;
        deal(address(_token), _raju, depositAmount);
        deal(_raju, _fees);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 vaultBalBefore = _token.balanceOf(address(_vault));
        uint256 lockLimitBefore = _vault.getCurrentLockLimit(_connector);

        assertTrue(
            depositAmount <= _vault.getCurrentLockLimit(_connector),
            "too big deposit"
        );

        vm.startPrank(_raju);
        _token.approve(address(_vault), depositAmount);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, depositAmount))
            ),
            bytes("0")
        );
        vm.expectCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, depositAmount))
            )
        );
        _vault.depositToAppChain{value: _fees}(
            _raju,
            depositAmount,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 vaultBalAfter = _token.balanceOf(address(_vault));
        uint256 lockLimitAfter = _vault.getCurrentLockLimit(_connector);

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
        deal(address(_token), _raju, usedLimit);
        vm.startPrank(_raju);
        _token.approve(address(_vault), usedLimit);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, usedLimit))
            ),
            bytes("0")
        );
        _vault.depositToAppChain{value: _fees}(
            _raju,
            usedLimit,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 lockLimitBefore = _vault.getCurrentLockLimit(_connector);

        assertTrue(lockLimitBefore < _lockMaxLimit, "full limit avail");
        assertTrue(
            lockLimitBefore + time * _lockRate < _lockMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 lockLimitAfter = _vault.getCurrentLockLimit(_connector);
        assertEq(
            lockLimitAfter,
            lockLimitBefore + time * _lockRate,
            "lock limit sus"
        );
    }

    function testFullLockLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 30 ether;
        uint256 time = 100;
        deal(_raju, _fees);
        deal(address(_token), _raju, usedLimit);
        vm.startPrank(_raju);
        _token.approve(address(_vault), usedLimit);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, usedLimit))
            ),
            bytes("0")
        );
        _vault.depositToAppChain{value: _fees}(
            _raju,
            usedLimit,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 lockLimitBefore = _vault.getCurrentLockLimit(_connector);

        assertTrue(lockLimitBefore < _lockMaxLimit, "full limit avail");
        assertTrue(
            lockLimitBefore + time * _lockRate > _lockMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 lockLimitAfter = _vault.getCurrentLockLimit(_connector);
        assertEq(lockLimitAfter, _lockMaxLimit, "lock limit sus");
    }

    function testReceiveInboundConnectorUnavail() external {
        _setLimits();
        uint256 withdrawAmount = 2 ether;
        deal(address(_token), address(_vault), withdrawAmount);

        vm.expectRevert(Vault.ConnectorUnavailable.selector);
        vm.prank(_wrongConnector);
        _vault.receiveInbound(abi.encode(_raju, withdrawAmount));
    }

    function testFullConsumeInboundReceive() external {
        _setLimits();
        uint256 withdrawAmount = 2 ether;
        deal(address(_token), address(_vault), withdrawAmount);

        uint256 vaultBalBefore = _token.balanceOf(address(_vault));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksBefore = _vault.connectorPendingUnlocks(
            _connector
        );
        uint256 unlockLimitBefore = _vault.getCurrentUnlockLimit(_connector);

        assertTrue(withdrawAmount <= unlockLimitBefore, "limit hit");

        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, withdrawAmount));

        uint256 vaultBalAfter = _token.balanceOf(address(_vault));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksAfter = _vault.connectorPendingUnlocks(
            _connector
        );
        uint256 unlockLimitAfter = _vault.getCurrentUnlockLimit(_connector);

        assertEq(
            vaultBalAfter,
            vaultBalBefore - withdrawAmount,
            "vault balance sus"
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
            connectorPendingUnlocksAfter,
            connectorPendingUnlocksBefore,
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
        deal(address(_token), address(_vault), withdrawAmount);

        uint256 vaultBalBefore = _token.balanceOf(address(_vault));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksBefore = _vault.connectorPendingUnlocks(
            _connector
        );
        uint256 unlockLimitBefore = _vault.getCurrentUnlockLimit(_connector);

        assertTrue(unlockLimitBefore > 0, "no unlock limit available");
        assertTrue(withdrawAmount > unlockLimitBefore, "unlock not partial");

        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, withdrawAmount));

        uint256 vaultBalAfter = _token.balanceOf(address(_vault));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksAfter = _vault.connectorPendingUnlocks(
            _connector
        );
        uint256 unlockLimitAfter = _vault.getCurrentUnlockLimit(_connector);

        assertEq(
            vaultBalAfter,
            vaultBalBefore - unlockLimitBefore,
            "vault balance sus"
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
            connectorPendingUnlocksAfter,
            connectorPendingUnlocksBefore + withdrawAmount - unlockLimitBefore,
            "total pending amount sus"
        );
        assertEq(unlockLimitAfter, 0, "unlock limit sus");
    }

    function testPartUnlockLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 20 ether;
        uint256 time = 10;
        deal(address(_token), address(_vault), usedLimit);
        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, usedLimit));

        uint256 unlockLimitBefore = _vault.getCurrentUnlockLimit(_connector);

        assertTrue(unlockLimitBefore < _unlockMaxLimit, "full limit avail");
        assertTrue(
            unlockLimitBefore + time * _unlockRate < _unlockMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 unlockLimitAfter = _vault.getCurrentUnlockLimit(_connector);
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
        deal(address(_token), address(_vault), usedLimit);
        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, usedLimit));

        uint256 unlockLimitBefore = _vault.getCurrentUnlockLimit(_connector);

        assertTrue(unlockLimitBefore < _unlockMaxLimit, "full limit avail");
        assertTrue(
            unlockLimitBefore + time * _unlockRate > _unlockMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 unlockLimitAfter = _vault.getCurrentUnlockLimit(_connector);
        assertEq(unlockLimitAfter, _unlockMaxLimit, "unlock limit sus");
    }

    function testUnlockPendingConnectorUnavail() external {
        _setLimits();
        uint256 withdrawAmount = 2 ether;
        deal(address(_token), address(_vault), withdrawAmount);

        vm.expectRevert(Vault.ConnectorUnavailable.selector);
        _vault.unlockPendingFor(_raju, _wrongConnector);
    }

    function testFullConsumeUnlockPending() external {
        _setLimits();
        uint256 withdrawAmount = 120 ether;
        uint256 time = 200;
        deal(address(_token), address(_vault), withdrawAmount);

        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, withdrawAmount));

        uint256 vaultBalBefore = _token.balanceOf(address(_vault));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksBefore = _vault.connectorPendingUnlocks(
            _connector
        );

        assertEq(
            vaultBalBefore,
            withdrawAmount - _unlockMaxLimit,
            "vault bal before sus"
        );
        assertEq(rajuBalBefore, _unlockMaxLimit, "raju bal before sus");
        assertEq(
            pendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            connectorPendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(
            time * _unlockRate > withdrawAmount - _unlockMaxLimit,
            "not enough time"
        );

        skip(time);
        _vault.unlockPendingFor(_raju, _connector);

        uint256 vaultBalAfter = _token.balanceOf(address(_vault));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksAfter = _vault.connectorPendingUnlocks(
            _connector
        );

        assertEq(vaultBalAfter, 0, "vault bal after sus");
        assertEq(rajuBalAfter, withdrawAmount, "raju bal after sus");
        assertEq(pendingUnlocksAfter, 0, "pending unlock after sus");
        assertEq(
            connectorPendingUnlocksAfter,
            0,
            "total pending unlock after sus"
        );
    }

    function testPartConsumeUnlockPending() external {
        _setLimits();
        uint256 withdrawAmount = 120 ether;
        uint256 time = 5;
        deal(address(_token), address(_vault), withdrawAmount);

        vm.prank(_connector);
        _vault.receiveInbound(abi.encode(_raju, withdrawAmount));

        uint256 vaultBalBefore = _token.balanceOf(address(_vault));
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksBefore = _vault.connectorPendingUnlocks(
            _connector
        );
        uint256 newUnlock = time * _unlockRate;

        assertEq(
            vaultBalBefore,
            withdrawAmount - _unlockMaxLimit,
            "vault bal before sus"
        );
        assertEq(rajuBalBefore, _unlockMaxLimit, "raju bal before sus");
        assertEq(
            pendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            connectorPendingUnlocksBefore,
            withdrawAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(withdrawAmount - _unlockMaxLimit > 0, "what to unlock?");

        assertTrue(
            newUnlock < withdrawAmount - _unlockMaxLimit,
            "too much time"
        );

        skip(time);
        _vault.unlockPendingFor(_raju, _connector);

        uint256 vaultBalAfter = _token.balanceOf(address(_vault));
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = _vault.pendingUnlocks(_connector, _raju);
        uint256 connectorPendingUnlocksAfter = _vault.connectorPendingUnlocks(
            _connector
        );

        assertEq(
            vaultBalAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "vault bal after sus"
        );
        assertEq(
            rajuBalAfter,
            _unlockMaxLimit + newUnlock,
            "raju bal after sus"
        );
        assertEq(
            pendingUnlocksAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "pending unlock after sus"
        );
        assertEq(
            connectorPendingUnlocksAfter,
            withdrawAmount - _unlockMaxLimit - newUnlock,
            "total pending unlock after sus"
        );
    }
}
