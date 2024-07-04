pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
import "../../contracts/bridge/Controller.sol";
import "../../contracts/common/Errors.sol";
import "../../contracts/bridge/FiatTokenV2_1/FiatTokenV2_1_Controller.sol";
import "../../contracts/hooks/LimitExecutionHook.sol";
import "forge-std/console.sol";
import "../../contracts/utils/Gauge.sol";
import "../../contracts/hooks/plugins/ExecutionHelper.sol";

abstract contract TestBaseController is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _connector1 = address(uint160(_c++));
    address immutable _connector2 = address(uint160(_c++));
    address immutable _wrongConnector = address(uint160(_c++));
    uint32 _siblingChainSlug = uint32(_c++);
    uint256 immutable _connectorPoolId = _c++;
    bytes32 immutable _messageId = bytes32(_c++);
    LimitExecutionHook hook__;
    uint256 constant _burnMaxLimit = 200 ether;
    uint256 constant _burnRate = 2 ether;
    uint256 constant _mintMaxLimit = 100 ether;
    uint256 constant _mintRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    bool isFiatTokenV2_1;
    ERC20 _token;
    Controller _controller;
    ExecutionHelper _executionHelper;

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    event ConnectorPoolIdUpdated(address connector, uint256 poolId);
    event ConnectorStatusUpdated(address connector, bool status);
    event BridgingTokens(
        address connector,
        address sender,
        address receiver,
        uint256 amount,
        bytes32 messageId
    );
    event TokensBridged(
        address connecter,
        address receiver,
        uint256 amount,
        bytes32 messageId
    );

    function _setLimits(address[] memory connectors_) internal {
        UpdateLimitParams[] memory u = new UpdateLimitParams[](
            connectors_.length * 2
        );

        for (uint256 i = 0; i < connectors_.length; i++) {
            u[2 * i] = UpdateLimitParams(
                true,
                connectors_[i],
                _mintMaxLimit,
                _mintRate
            );
            u[2 * i + 1] = UpdateLimitParams(
                false,
                connectors_[i],
                _burnMaxLimit,
                _burnRate
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
        _setConnectorPoolId(connectors_);
        _setConnectorStatus(connectors_);
    }

    function _setConnectorPoolId(address[] memory connectors_) internal {
        uint256[] memory poolIds = new uint256[](connectors_.length);
        for (uint256 i = 0; i < connectors_.length; i++) {
            poolIds[i] = _connectorPoolId;
        }
        vm.prank(_admin);
        hook__.updateConnectorPoolId(connectors_, poolIds);
    }

    function _setConnectorStatus(address[] memory connectors_) internal {
        bool[] memory statuses = new bool[](connectors_.length);
        for (uint256 i = 0; i < connectors_.length; i++) {
            statuses[i] = true;
        }
        vm.prank(_admin);
        _controller.updateConnectorStatus(connectors_, statuses);
    }

    function testSetInvalidPoolId() external {
        address[] memory connectors = new address[](1);
        uint256[] memory poolIds = new uint256[](1);
        connectors[0] = _connector;
        poolIds[0] = 0;
        vm.prank(_admin);
        vm.expectRevert(InvalidPoolId.selector);
        hook__.updateConnectorPoolId(connectors, poolIds);
    }

    function testWithdrawConnectorUnavail() external {
        uint256 withdrawAmount = 2 ether;
        vm.prank(_raju);
        deal(_raju, _fees);
        vm.expectRevert(InvalidConnector.selector);
        _controller.bridge{value: _fees}(
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
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );
    }

    function testInvalidPoolIdReceiveInbound() external {
        // Not setting connectorPoolId
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        uint256 withdrawAmount = 2 ether;
        _setLimits(connectors);
        _setConnectorStatus(connectors);

        bytes memory payload_ = abi.encode(
            _raju,
            withdrawAmount,
            bytes32(0),
            new bytes(0)
        );
        vm.prank(_connector);
        vm.expectRevert(InvalidPoolId.selector);
        _controller.receiveInbound(_siblingChainSlug, payload_);
    }

    function testInvalidPoolIdWithdraw() external {
        uint256 withdrawAmount = 2 ether;
        address[] memory connectors = new address[](1);
        connectors[0] = _wrongConnector;
        _setLimits(connectors);
        _setConnectorStatus(connectors);

        connectors[0] = _connector;
        _setLimits(connectors);
        _setConnectorStatus(connectors);
        _setConnectorPoolId(connectors);

        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );
        deal(_raju, _fees);

        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_controller), withdrawAmount);
        }
        vm.expectRevert(InvalidPoolId.selector);
        _controller.bridge{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _wrongConnector,
            new bytes(0),
            new bytes(0)
        );
        vm.stopPrank();
    }

    function testWithdrawLimitHit() external {
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
            _token.approve(address(_controller), withdrawAmount);
        }
        vm.expectRevert(InsufficientFunds.selector);
        _controller.bridge{value: _fees}(
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
            _token.approve(address(_controller), dealAmount);
        }
        vm.expectRevert(ZeroAddressReceiver.selector);
        _controller.bridge{value: _fees}(
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
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(
                address(_controller),
                withdrawAmount,
                bytes32(0),
                new bytes(0)
            )
        );

        vm.expectRevert(CannotTransferOrExecuteOnBridgeContracts.selector);
        _controller.receiveInbound(
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

    function testWithdrawPoolConnectors() external {
        address[] memory connectors = new address[](2);
        connectors[0] = _connector;
        connectors[1] = _connector2;
        _setupConnectors(connectors);

        uint256 totalAmount = 20 ether;
        uint256 withdrawAmount = 5 ether;
        uint256 withdrawAmount2 = 15 ether;
        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, totalAmount, bytes32(0), new bytes(0))
        );
        deal(_raju, _fees * 2);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 poolLockedBefore = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(poolLockedBefore, totalAmount, "pool locked sus");

        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_controller), totalAmount);
        }

        _mockConnectorAndBridge(_connector, _raju, withdrawAmount);

        _mockConnectorAndBridge(_connector2, _raju, withdrawAmount2);

        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 poolLockedAfter = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            rajuBalAfter,
            rajuBalBefore - withdrawAmount - withdrawAmount2,
            "raju balance sus"
        );
        assertEq(
            poolLockedAfter,
            poolLockedBefore - withdrawAmount - withdrawAmount2,
            "connector locked sus"
        );
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
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, payload, new bytes(0))
            ),
            abi.encode(_messageId)
        );
        _controller.bridge{value: _fees}(
            receiver_,
            amount_,
            _msgGasLimit,
            connector_,
            new bytes(0),
            new bytes(0)
        );
    }

    function testWithdraw() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 withdrawAmount = 10 ether;
        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, bytes32(0), new bytes(0))
        );
        deal(_raju, _fees);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 burnLimitBefore = hook__.getCurrentSendingLimit(_connector);
        uint256 poolLockedBefore = hook__.poolLockedAmounts(_connectorPoolId);

        assertTrue(
            withdrawAmount <= hook__.getCurrentSendingLimit(_connector),
            "too big withdraw"
        );

        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_controller), withdrawAmount);
        }
        _mockConnectorAndBridge(_connector, _raju, withdrawAmount);
        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 burnLimitAfter = hook__.getCurrentSendingLimit(_connector);
        uint256 poolLockedAfter = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            rajuBalAfter,
            rajuBalBefore - withdrawAmount,
            "raju balance sus"
        );
        assertEq(
            totalMintedAfter,
            totalMintedBefore - withdrawAmount,
            "total minted sus"
        );
        assertEq(
            burnLimitAfter,
            burnLimitBefore - withdrawAmount,
            "burn limit sus"
        );
        assertEq(
            poolLockedAfter,
            poolLockedBefore - withdrawAmount,
            "connector locked sus"
        );
    }

    function testWithdrawWithNoHook() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setConnectorStatus(connectors);
        vm.prank(_admin);
        // set NO Hook for the controller
        _controller.updateHook(address(0), false);
        uint256 withdrawAmount = 10 ether;

        vm.prank(_connector);
        vm.expectEmit(true, true, true, true);
        emit TokensBridged(_connector, _raju, withdrawAmount, _messageId);

        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, withdrawAmount, _messageId, new bytes(0))
        );

        deal(_raju, _fees);
        vm.startPrank(_raju);
        if (isFiatTokenV2_1) {
            _token.approve(address(_controller), withdrawAmount);
        }

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

        _controller.bridge{value: msgValue}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _connector,
            new bytes(0),
            new bytes(0)
        );

        vm.stopPrank();
    }

    function testFullConsumeInboundReceive() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsBefore = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 mintLimitBefore = hook__.getCurrentReceivingLimit(_connector);
        uint256 poolLockedBefore = hook__.poolLockedAmounts(_connectorPoolId);

        assertTrue(depositAmount <= mintLimitBefore, "limit hit");

        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsAfter = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 mintLimitAfter = hook__.getCurrentReceivingLimit(_connector);
        uint256 poolLockedAfter = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            totalMintedAfter,
            totalMintedBefore + depositAmount,
            "total minted sus"
        );
        assertEq(
            rajuBalAfter,
            rajuBalBefore + depositAmount,
            "raju balance sus"
        );
        assertEq(pendingMintsAfter, pendingMintsBefore, "pending mints sus");
        assertEq(
            connectorPendingMintsAfter,
            connectorPendingMintsBefore,
            "total pending amount sus"
        );
        assertEq(
            mintLimitAfter,
            mintLimitBefore - depositAmount,
            "mint limit sus"
        );
        assertEq(
            poolLockedAfter,
            poolLockedBefore + depositAmount,
            "connector locked amount sus"
        );
    }

    function testPartConsumeInboundReceive() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 110 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsBefore = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 mintLimitBefore = hook__.getCurrentReceivingLimit(_connector);
        uint256 poolLockedBefore = hook__.poolLockedAmounts(_connectorPoolId);

        assertTrue(mintLimitBefore > 0, "no mint limit available");
        assertTrue(depositAmount > mintLimitBefore, "mint not partial");

        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsAfter = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 mintLimitAfter = hook__.getCurrentReceivingLimit(_connector);
        uint256 poolLockedAfter = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            totalMintedAfter,
            totalMintedBefore + mintLimitBefore,
            "total minted sus"
        );
        assertEq(
            rajuBalAfter,
            rajuBalBefore + mintLimitBefore,
            "raju balance sus"
        );
        assertEq(
            pendingMintsAfter,
            pendingMintsBefore + depositAmount - mintLimitBefore,
            "pending mints sus"
        );
        assertEq(
            connectorPendingMintsAfter,
            connectorPendingMintsBefore + depositAmount - mintLimitBefore,
            "total pending amount sus"
        );
        assertEq(mintLimitAfter, 0, "mint limit sus");
        assertEq(
            poolLockedAfter,
            poolLockedBefore + depositAmount,
            "connector locked amount sus"
        );
    }

    function testMintPendingConnectorUnavail() external {
        // Not setting connectorStatus for _connector
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setLimits(connectors);
        _setConnectorPoolId(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.expectRevert(InvalidConnector.selector);
        _controller.retry(_connector, _messageId);
    }

    function testMintPendingNoIdentifierCache() external {
        // Not setting connectorStatus for _connector
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.expectRevert(NoPendingData.selector);
        _controller.retry(_connector, _messageId);
    }

    function testFullConsumeMintPending() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 120 ether;
        uint256 time = 200;

        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );
        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsBefore = hook__.getConnectorPendingAmount(
            _connector
        );
        assertEq(totalMintedBefore, _mintMaxLimit, "total minted before sus");
        assertEq(rajuBalBefore, _mintMaxLimit, "raju bal before sus");
        assertEq(
            pendingMintsBefore,
            depositAmount - _mintMaxLimit,
            "pending mint before sus"
        );
        assertEq(
            connectorPendingMintsBefore,
            depositAmount - _mintMaxLimit,
            "total pending mint before sus"
        );
        assertTrue(
            time * _mintRate > depositAmount - _mintMaxLimit,
            "not enough time"
        );

        skip(time);
        _controller.retry(_connector, _messageId);

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsAfter = hook__.getConnectorPendingAmount(
            _connector
        );

        assertEq(totalMintedAfter, depositAmount, "total minted after sus");
        assertEq(rajuBalAfter, depositAmount, "raju bal after sus");
        assertEq(pendingMintsAfter, 0, "pending mint after sus");
        assertEq(connectorPendingMintsAfter, 0, "total pending mint after sus");
    }

    function testPartConsumeMintPending() external {
        address[] memory connectors = new address[](1);
        connectors[0] = _connector;
        _setupConnectors(connectors);

        uint256 depositAmount = 120 ether;
        uint256 time = 5;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.prank(_connector);
        _controller.receiveInbound(
            _siblingChainSlug,
            abi.encode(_raju, depositAmount, _messageId, new bytes(0))
        );

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsBefore = hook__.getConnectorPendingAmount(
            _connector
        );
        uint256 newMint = time * _mintRate;

        assertEq(totalMintedBefore, _mintMaxLimit, "total minted before sus");
        assertEq(rajuBalBefore, _mintMaxLimit, "raju bal before sus");
        assertEq(
            pendingMintsBefore,
            depositAmount - _mintMaxLimit,
            "pending mint before sus"
        );
        assertEq(
            connectorPendingMintsBefore,
            depositAmount - _mintMaxLimit,
            "total pending mint before sus"
        );
        assertTrue(depositAmount - _mintMaxLimit > 0, "what to mint?");

        assertTrue(newMint < depositAmount - _mintMaxLimit, "too much time");

        skip(time);
        _controller.retry(_connector, _messageId);

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = hook__.getIdentifierPendingAmount(
            _messageId
        );
        uint256 connectorPendingMintsAfter = hook__.getConnectorPendingAmount(
            _connector
        );
        assertEq(
            totalMintedAfter,
            _mintMaxLimit + newMint,
            "total minted after sus"
        );
        assertEq(rajuBalAfter, _mintMaxLimit + newMint, "raju bal after sus");
        assertEq(
            pendingMintsAfter,
            depositAmount - _mintMaxLimit - newMint,
            "pending mint after sus"
        );
        assertEq(
            connectorPendingMintsAfter,
            depositAmount - _mintMaxLimit - newMint,
            "total pending mint after sus"
        );
    }
}

contract TestNormalController is TestBaseController {
    function setUp() external {
        isFiatTokenV2_1 = false;
        vm.startPrank(_admin);
        _token = new MintableToken("Moon", "MOON", 18);
        _controller = new Controller(address(_token));
        _executionHelper = new ExecutionHelper(_admin);
        hook__ = new LimitExecutionHook(
            _admin,
            address(_controller),
            address(_executionHelper),
            true
        );
        _executionHelper.setHook(address(hook__));
        _controller.updateHook(address(hook__), false);
        vm.stopPrank();
    }
}

// contract TestFiatTokenV2_1_Controller is TestController {
//     function setUp() external {
//         isFiatTokenV2_1 = true;
//         vm.startPrank(_admin);
//         _token = new FiatTokenV2_1_Mintable("Moon", "MOON", 18);
//         _controller = new FiatTokenV2_1_Controller(
//             address(_token)
//         );
//         vm.stopPrank();
//     }
// }
