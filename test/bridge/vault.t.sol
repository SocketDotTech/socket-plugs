pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
import "../../contracts/bridge/Vault.sol";
import "../../contracts/common/Errors.sol";
import "../../contracts/hooks/LimitExecutionHook.sol";
import "forge-std/console.sol";
import "../../contracts/utils/Gauge.sol";
import "../../contracts/hooks/plugins/ExecutionHelper.sol";

contract TestVault is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _connector1 = address(uint160(_c++));
    address immutable _connector2 = address(uint160(_c++));
    address immutable _wrongConnector = address(uint160(_c++));
    uint32 _siblingChainSlug = uint32(_c++);
    bytes32 _messageId = bytes32(_c++);
    LimitExecutionHook hook__;
    uint256 constant _lockMaxLimit = 200 ether;
    uint256 constant _lockRate = 2 ether;
    uint256 constant _unlockMaxLimit = 100 ether;
    uint256 constant _unlockRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    bool isFiatTokenV2_1;
    ERC20 _token;
    Vault _vault;
    ExecutionHelper _executionHelper;
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");
    event BridgingTokens(
        address connector,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId
    );
    event ConnectorStatusUpdated(address connector, bool status);

    function setUp() external {
        isFiatTokenV2_1 = false;
        vm.startPrank(_admin);
        _token = new MintableToken("Moon", "MOON", 18);
        _vault = new Vault(address(_token));
        _executionHelper = new ExecutionHelper(_admin);
        hook__ = new LimitExecutionHook(
            _admin,
            address(_vault),
            address(_executionHelper),
            false
        );
        _executionHelper.setHook(address(hook__));
        _vault.updateHook(address(hook__), false);
        vm.stopPrank();
    }

    function ethSetUp() public {
        isFiatTokenV2_1 = false;
        vm.startPrank(_admin);
        _token = ERC20(ETH_ADDRESS);
        _vault = new Vault(address(_token));
        _executionHelper = new ExecutionHelper(_admin);
        hook__ = new LimitExecutionHook(
            _admin,
            address(_vault),
            address(_executionHelper),
            false
        );
        _executionHelper.setHook(address(hook__));
        _vault.updateHook(address(hook__), false);
        vm.stopPrank();
    }

    function _setLimits(address[] memory connectors_) internal {
        UpdateLimitParams[] memory u = new UpdateLimitParams[](
            connectors_.length * 2
        );

        for (uint256 i = 0; i < connectors_.length; i++) {
            u[2 * i] = UpdateLimitParams(
                true,
                connectors_[i],
                _unlockMaxLimit,
                _unlockRate
            );
            u[2 * i + 1] = UpdateLimitParams(
                false,
                connectors_[i],
                _lockMaxLimit,
                _lockRate
            );
        }
        vm.startPrank(_admin);
        hook__.grantRole(LIMIT_UPDATER_ROLE, _admin);
        hook__.updateLimitParams(u);
        skip(_bootstrapTime);
        vm.stopPrank();
    }

    function _setupConnectors(address[] memory connectors_) internal {
        _setLimits(connectors_);
        _setConnectorStatus(connectors_);
    }

    function _setConnectorStatus(address[] memory connectors_) internal {
        bool[] memory statuses = new bool[](connectors_.length);
        for (uint256 i = 0; i < connectors_.length; i++) {
            statuses[i] = true;
        }
        vm.prank(_admin);
        _vault.updateConnectorStatus(connectors_, statuses);
    }

    function testBridgeConnectorUnavail() external {
        uint256 withdrawAmount = 2 ether;
        vm.prank(_raju);
        deal(_raju, _fees);
        vm.expectRevert(InvalidConnector.selector);
        _vault.bridge{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _wrongConnector,
            new bytes(0),
            new bytes(0)
        );
    }

    function testReceiveInboundConnectorUnavail() external {
        uint256 withdrawAmount = 2 ether;
        deal(_raju, _fees);
        vm.prank(_wrongConnector);
        vm.expectRevert(InvalidConnector.selector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );
    }

    function testBridgeLimitHit() external {
        uint256 withdrawAmount = 201 ether;
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);
        assertTrue(
            withdrawAmount > hook__.getCurrentSendingLimit(_connector),
            "withdraw amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, withdrawAmount, true);
        deal(_raju, _fees);

        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_vault), withdrawAmount);
        }
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        _vault.bridge{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _connector,
            new bytes(0),
            new bytes(0)
        );
        vm.stopPrank();
    }

    function testZeroAddressWithdraw() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 withdrawAmount = 1 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_vault), dealAmount);
        }
        vm.expectRevert(ZeroAddressReceiver.selector);
        _vault.bridge{value: _fees}(
            address(0),
            withdrawAmount,
            _msgGasLimit,
            _connector,
            new bytes(0),
            new bytes(0)
        );
        vm.stopPrank();
    }

    function testInvalidAddressReceiveInbound() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 withdrawAmount = 1 ether;
        vm.startPrank(_connector);
        vm.expectRevert(CannotTransferOrExecuteOnBridgeContracts.selector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(
                address(_vault),
                withdrawAmount,
                bytes32(0),
                new bytes(0)
            )
        );

        vm.expectRevert(CannotTransferOrExecuteOnBridgeContracts.selector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(
                address(_token),
                withdrawAmount,
                bytes32(0),
                new bytes(0)
            )
        );

        vm.stopPrank();
    }

    function _mockConnectorAndBridge(
        address connector_,
        address receiver_,
        uint256 amount_
    ) public {
        bytes memory payload = abi.encode(
            receiver_,
            amount_,
            _messageId,
            new bytes(0)
        );

        uint256 msgValue = address(_token) == ETH_ADDRESS
            ? amount_ + _fees
            : _fees;

        vm.expectCall(
            connector_,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, payload, new bytes(0))
            )
        );

        vm.mockCall(
            connector_,
            abi.encodeCall(IConnector.getMessageId, ()),
            abi.encode(_messageId)
        );

        vm.mockCall(
            connector_,
            _fees,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, payload, new bytes(0))
            ),
            abi.encode(_messageId)
        );
        _vault.bridge{value: msgValue}(
            receiver_,
            amount_,
            _msgGasLimit,
            connector_,
            new bytes(0),
            new bytes(0)
        );
    }

    function testBridge() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 withdrawAmount = 10 ether;
        assertTrue(
            withdrawAmount <= hook__.getCurrentSendingLimit(_connector),
            "too big withdraw"
        );

        deal(_raju, _fees);
        deal(address(_token), _raju, withdrawAmount, true);

        uint256 lockLimitBefore = hook__.getCurrentSendingLimit(_connector);

        vm.startPrank(_raju);
        _token.approve(address(_vault), withdrawAmount);
        _mockConnectorAndBridge(_connector, _raju, withdrawAmount);
        vm.stopPrank();

        uint256 lockLimitAfter = hook__.getCurrentSendingLimit(_connector);

        assertEq(
            lockLimitAfter,
            lockLimitBefore - withdrawAmount,
            "lock limit sus"
        );

        uint256 rajuBalBefore = _token.balanceOf(_raju);

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );

        uint256 rajuBalAfter = _token.balanceOf(_raju);

        assertEq(
            rajuBalAfter,
            rajuBalBefore + withdrawAmount,
            "raju balance sus"
        );
    }

    function testBridgeWithNoHook() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setConnectorStatus(connectors);
        vm.prank(_admin);
        // set NO Hook for the vault
        _vault.updateHook(address(0), false);
        uint256 withdrawAmount = 10 ether;
        deal(_raju, _fees);
        deal(address(_token), _raju, withdrawAmount, true);

        vm.startPrank(_raju);
        _token.approve(address(_vault), withdrawAmount);

        bytes memory payload = abi.encode(
            _raju,
            withdrawAmount,
            _messageId,
            new bytes(0)
        );

        uint256 msgValue = _fees;

        vm.mockCall(
            _connector,
            abi.encodeCall(IConnector.getMessageId, ()),
            abi.encode(_messageId)
        );

        vm.mockCall(
            _connector,
            _fees,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, payload, new bytes(0))
            ),
            abi.encode(_messageId)
        );
        vm.expectEmit(true, true, true, true);
        emit BridgingTokens(
            _connector,
            _raju,
            _raju,
            withdrawAmount,
            _messageId
        );

        _vault.bridge{value: msgValue}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _connector,
            new bytes(0),
            new bytes(0)
        );

        vm.stopPrank();
    }

    function testNativeBridge() external {
        ethSetUp();
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 withdrawAmount = 10 ether;
        assertTrue(
            withdrawAmount <= hook__.getCurrentSendingLimit(_connector),
            "too big withdraw"
        );

        deal(_raju, _fees + withdrawAmount);

        uint256 lockLimitBefore = hook__.getCurrentSendingLimit(_connector);

        vm.startPrank(_raju);
        _mockConnectorAndBridge(_connector, _raju, withdrawAmount);
        vm.stopPrank();

        uint256 lockLimitAfter = hook__.getCurrentSendingLimit(_connector);

        assertEq(
            lockLimitAfter,
            lockLimitBefore - withdrawAmount,
            "lock limit sus"
        );

        uint256 rajuBalBefore = _raju.balance;

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );

        uint256 rajuBalAfter = _raju.balance;

        assertEq(
            rajuBalAfter,
            rajuBalBefore + withdrawAmount,
            "raju balance sus"
        );
    }

    function testFullConsumeInboundReceive() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_vault), depositAmount, true);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksBefore = hook__
            .getConnectorPendingAmount(_connector);
        uint256 unlockLimitBefore = hook__.getCurrentReceivingLimit(_connector);

        assertTrue(depositAmount <= unlockLimitBefore, "limit hit");

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksAfter = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 unlockLimitAfter = hook__.getCurrentReceivingLimit(_connector);

        assertEq(
            rajuBalAfter,
            rajuBalBefore + depositAmount,
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
            unlockLimitBefore - depositAmount,
            "unlock limit sus"
        );
    }

    function testPartConsumeInboundReceive() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 110 ether;
        deal(address(_token), address(_vault), depositAmount, true);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksBefore = hook__
            .getConnectorPendingAmount(_connector);
        uint256 unlockLimitBefore = hook__.getCurrentReceivingLimit(_connector);

        assertTrue(unlockLimitBefore > 0, "no unlock limit available");
        assertTrue(depositAmount > unlockLimitBefore, "unlock not partial");

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksAfter = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 unlockLimitAfter = hook__.getCurrentReceivingLimit(_connector);

        assertEq(
            rajuBalAfter,
            rajuBalBefore + unlockLimitBefore,
            "raju balance sus"
        );
        assertEq(
            pendingUnlocksAfter,
            pendingUnlocksBefore + depositAmount - unlockLimitBefore,
            "pending unlocks sus"
        );
        assertEq(
            connectorPendingUnlocksAfter,
            connectorPendingUnlocksBefore + depositAmount - unlockLimitBefore,
            "total pending amount sus"
        );
        assertEq(unlockLimitAfter, 0, "unlock limit sus");
    }

    function testUnlockPendingConnectorUnavail() external {
        // Not setting connectorStatus for _connector
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setLimits(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_vault), depositAmount, true);

        vm.expectRevert(InvalidConnector.selector);
        _vault.retry(_connector, _messageId);
    }

    function testUnlockPendingNoIdentifierCache() external {
        // Not setting connectorStatus for _connector
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_vault), depositAmount, true);

        vm.expectRevert(NoPendingData.selector);
        _vault.retry(_connector, _messageId);
    }

    function testFullConsumeUnlockPending() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 120 ether;
        uint256 time = 200;
        deal(address(_token), address(_vault), depositAmount, true);

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksBefore = hook__
            .getConnectorPendingAmount(_connector);
        assertEq(rajuBalBefore, _unlockMaxLimit, "raju bal before sus");
        assertEq(
            pendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            connectorPendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(
            time * _unlockRate > depositAmount - _unlockMaxLimit,
            "not enough time"
        );

        skip(time);
        _vault.retry(_connector, _messageId);

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksAfter = hook__.getConnectorPendingAmount(
            _connector
        );

        assertEq(rajuBalAfter, depositAmount, "raju bal after sus");
        assertEq(pendingUnlocksAfter, 0, "pending unlock after sus");
        assertEq(
            connectorPendingUnlocksAfter,
            0,
            "total pending unlock after sus"
        );
    }

    function testPartConsumeUnlockPending() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 120 ether;
        uint256 time = 5;
        deal(address(_token), address(_vault), depositAmount, true);

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingUnlocksBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksBefore = hook__
            .getConnectorPendingAmount(_connector);
        uint256 newUnlock = time * _unlockRate;

        assertEq(rajuBalBefore, _unlockMaxLimit, "raju bal before sus");
        assertEq(
            pendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            connectorPendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(depositAmount - _unlockMaxLimit > 0, "what to unlock?");

        assertTrue(
            newUnlock < depositAmount - _unlockMaxLimit,
            "too much time"
        );

        skip(time);
        _vault.retry(_connector, _messageId);

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingUnlocksAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksAfter = hook__.getConnectorPendingAmount(
            _connector
        );

        assertEq(
            rajuBalAfter,
            _unlockMaxLimit + newUnlock,
            "raju bal after sus"
        );
        assertEq(
            pendingUnlocksAfter,
            depositAmount - _unlockMaxLimit - newUnlock,
            "pending unlock after sus"
        );
        assertEq(
            connectorPendingUnlocksAfter,
            depositAmount - _unlockMaxLimit - newUnlock,
            "total pending unlock after sus"
        );
    }

    function testPartConsumeNativeUnlockPending() external {
        ethSetUp();

        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 420 ether;
        uint256 time = 5;
        deal(address(_vault), depositAmount);

        vm.prank(_connector);
        _vault.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 rajuBalBefore = _raju.balance;
        uint256 pendingUnlocksBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksBefore = hook__
            .getConnectorPendingAmount(_connector);
        uint256 newUnlock = time * _unlockRate;

        assertEq(rajuBalBefore, _unlockMaxLimit, "raju bal before sus");
        assertEq(
            pendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "pending unlock before sus"
        );
        assertEq(
            connectorPendingUnlocksBefore,
            depositAmount - _unlockMaxLimit,
            "total pending unlock before sus"
        );
        assertTrue(depositAmount - _unlockMaxLimit > 0, "what to unlock?");

        assertTrue(
            newUnlock < depositAmount - _unlockMaxLimit,
            "too much time"
        );

        skip(time);
        _vault.retry(_connector, _messageId);

        uint256 rajuBalAfter = _raju.balance;
        uint256 pendingUnlocksAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingUnlocksAfter = hook__.getConnectorPendingAmount(
            _connector
        );

        assertEq(
            rajuBalAfter,
            _unlockMaxLimit + newUnlock,
            "raju bal after sus"
        );
        assertEq(
            pendingUnlocksAfter,
            depositAmount - _unlockMaxLimit - newUnlock,
            "pending unlock after sus"
        );
        assertEq(
            connectorPendingUnlocksAfter,
            depositAmount - _unlockMaxLimit - newUnlock,
            "total pending unlock after sus"
        );
    }
}
