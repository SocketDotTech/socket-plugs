pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/MintableToken.sol";
import "../src/Controller.sol";
import "../src/ExchangeRate.sol";

contract TestController is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _wrongConnector = address(uint160(_c++));

    uint256 immutable _connectorPoolId = _c++;

    uint256 constant _burnMaxLimit = 200 ether;
    uint256 constant _burnRate = 2 ether;
    uint256 constant _mintMaxLimit = 100 ether;
    uint256 constant _mintRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    ERC20 _token;
    Controller _controller;

    function setUp() external {
        vm.startPrank(_admin);
        _token = new MintableToken("Moon", "MOON", 18);
        _controller = new Controller(
            address(_token),
            address(new ExchangeRate())
        );
        vm.stopPrank();
    }

    function _setLimits() internal {
        Controller.UpdateLimitParams[]
            memory u = new Controller.UpdateLimitParams[](2);
        u[0] = Controller.UpdateLimitParams(
            true,
            _connector,
            _mintMaxLimit,
            _mintRate
        );
        u[1] = Controller.UpdateLimitParams(
            false,
            _connector,
            _burnMaxLimit,
            _burnRate
        );

        vm.prank(_admin);
        _controller.updateLimitParams(u);
        skip(_bootstrapTime);
    }

        function _setConnectorPoolId() internal {
        address[]
            memory connectors = new address[](1);
        uint256[] memory poolIds = new uint256[](1);
        connectors[0] =  _connector;
        poolIds[0] = _connectorPoolId;
        vm.prank(_admin);
        _controller.updateConnectorPoolId(connectors, poolIds);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        Controller.LimitParams memory burnLimitParams = _controller
            .getBurnLimitParams(_connector);
        Controller.LimitParams memory mintLimitParams = _controller
            .getMintLimitParams(_connector);

        assertEq(
            burnLimitParams.maxLimit,
            _burnMaxLimit,
            "burn max limit not updated"
        );
        assertEq(
            burnLimitParams.ratePerSecond,
            _burnRate,
            "burn rate not updated"
        );

        assertEq(
            mintLimitParams.maxLimit,
            _mintMaxLimit,
            "mint max limit not updated"
        );
        assertEq(
            mintLimitParams.ratePerSecond,
            _mintRate,
            "mint rate not updated"
        );
    }

    function testUpdateLimitParamsRaju() external {
        Controller.UpdateLimitParams[]
            memory u = new Controller.UpdateLimitParams[](2);
        u[0] = Controller.UpdateLimitParams(
            true,
            _connector,
            _mintMaxLimit,
            _mintRate
        );
        u[1] = Controller.UpdateLimitParams(
            false,
            _connector,
            _burnMaxLimit,
            _burnRate
        );

        vm.prank(_raju);
        vm.expectRevert("Ownable: caller is not the owner");
        _controller.updateLimitParams(u);
    }

    function testWithdrawConnectorUnavail() external {
        uint256 withdrawAmount = 2 ether;
        _setLimits();
        _setConnectorPoolId();
        deal(_raju, _fees);
        vm.prank(_raju);
        vm.expectRevert(Controller.ConnectorUnavailable.selector);
        _controller.withdrawFromAppChain{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _wrongConnector
        );
    }

    function testWithdrawLimitHit() external {
        uint256 withdrawAmount = 201 ether;
        _setLimits();
        assertTrue(
            withdrawAmount > _controller.getCurrentBurnLimit(_connector),
            "withdraw amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, withdrawAmount, true);
        deal(_raju, _fees);

        vm.startPrank(_raju);
        _token.approve(address(_controller), withdrawAmount);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        _controller.withdrawFromAppChain{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();
    }

    function testWithdraw() external {
        _setLimits();
        _setConnectorPoolId();  
        uint256 withdrawAmount = 10 ether;
        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, withdrawAmount));
        deal(_raju, _fees);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 burnLimitBefore = _controller.getCurrentBurnLimit(_connector);
        uint256 poolLockedBefore = _controller.poolLockedAmounts(
            _connectorPoolId
        );

        assertTrue(
            withdrawAmount <= _controller.getCurrentBurnLimit(_connector),
            "too big withdraw"
        );

        vm.startPrank(_raju);
        _token.approve(address(_controller), withdrawAmount);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, withdrawAmount))
            ),
            bytes("0")
        );
        vm.expectCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, withdrawAmount))
            )
        );

        _controller.withdrawFromAppChain{value: _fees}(
            _raju,
            withdrawAmount,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 burnLimitAfter = _controller.getCurrentBurnLimit(_connector);
        uint256 poolLockedAfter = _controller.poolLockedAmounts(
            _connectorPoolId
        );

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

    function testPartBurnLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 30 ether;
        uint256 time = 10;
        deal(_raju, _fees);
        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, usedLimit));
        vm.startPrank(_raju);
        _token.approve(address(_controller), usedLimit);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, usedLimit))
            ),
            bytes("0")
        );
        _controller.withdrawFromAppChain{value: _fees}(
            _raju,
            usedLimit,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 burnLimitBefore = _controller.getCurrentBurnLimit(_connector);

        assertTrue(burnLimitBefore < _burnMaxLimit, "full limit avail");
        assertTrue(
            burnLimitBefore + time * _burnRate < _burnMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 burnLimitAfter = _controller.getCurrentBurnLimit(_connector);
        assertEq(
            burnLimitAfter,
            burnLimitBefore + time * _burnRate,
            "burn limit sus"
        );
    }

    function testFullBurnLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 30 ether;
        uint256 time = 100;
        deal(_raju, _fees);
        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, usedLimit));
        vm.startPrank(_raju);
        _token.approve(address(_controller), usedLimit);
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, usedLimit))
            ),
            bytes("0")
        );
        _controller.withdrawFromAppChain{value: _fees}(
            _raju,
            usedLimit,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 burnLimitBefore = _controller.getCurrentBurnLimit(_connector);

        assertTrue(burnLimitBefore < _burnMaxLimit, "full limit avail");
        assertTrue(
            burnLimitBefore + time * _burnRate > _burnMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 burnLimitAfter = _controller.getCurrentBurnLimit(_connector);
        assertEq(burnLimitAfter, _burnMaxLimit, "burn limit sus");
    }

    function testReceiveInboundConnectorUnavail() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.expectRevert(Controller.ConnectorUnavailable.selector);
        vm.prank(_wrongConnector);
        _controller.receiveInbound(abi.encode(_raju, depositAmount));
    }

    function testFullConsumeInboundReceive() external {
        _setLimits();
        _setConnectorPoolId();
        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = _controller.pendingMints(
            _connector,
            _raju
        );
        uint256 connectorPendingMintsBefore = _controller.connectorPendingMints(
            _connector
        );
        uint256 mintLimitBefore = _controller.getCurrentMintLimit(_connector);
        uint256 poolLockedBefore = _controller.poolLockedAmounts(
            _connectorPoolId
        );

        assertTrue(depositAmount <= mintLimitBefore, "limit hit");

        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, depositAmount));

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = _controller.pendingMints(_connector, _raju);
        uint256 connectorPendingMintsAfter = _controller.connectorPendingMints(
            _connector
        );
        uint256 mintLimitAfter = _controller.getCurrentMintLimit(_connector);
        uint256 poolLockedAfter = _controller.poolLockedAmounts(
            _connectorPoolId
        );

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
        _setLimits();
        _setConnectorPoolId();
        uint256 depositAmount = 110 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = _controller.pendingMints(
            _connector,
            _raju
        );
        uint256 connectorPendingMintsBefore = _controller.connectorPendingMints(
            _connector
        );
        uint256 mintLimitBefore = _controller.getCurrentMintLimit(_connector);
        uint256 poolLockedBefore = _controller.poolLockedAmounts(
            _connectorPoolId
        );

        assertTrue(mintLimitBefore > 0, "no mint limit available");
        assertTrue(depositAmount > mintLimitBefore, "mint not partial");

        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, depositAmount));

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = _controller.pendingMints(_connector, _raju);
        uint256 connectorPendingMintsAfter = _controller.connectorPendingMints(
            _connector
        );
        uint256 mintLimitAfter = _controller.getCurrentMintLimit(_connector);
        uint256 poolLockedAfter = _controller.poolLockedAmounts(
            _connectorPoolId
        );

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

    function testPartMintLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 20 ether;
        uint256 time = 10;
        deal(address(_token), address(_controller), usedLimit, true);
        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, usedLimit));

        uint256 mintLimitBefore = _controller.getCurrentMintLimit(_connector);

        assertTrue(mintLimitBefore < _mintMaxLimit, "full limit avail");
        assertTrue(
            mintLimitBefore + time * _mintRate < _mintMaxLimit,
            "too much time"
        );

        skip(time);

        uint256 mintLimitAfter = _controller.getCurrentMintLimit(_connector);
        assertEq(
            mintLimitAfter,
            mintLimitBefore + time * _mintRate,
            "mint limit sus"
        );
    }

    function testFullMintLimitReplenish() external {
        _setLimits();
        uint256 usedLimit = 20 ether;
        uint256 time = 100;
        deal(address(_token), address(_controller), usedLimit, true);
        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, usedLimit));

        uint256 mintLimitBefore = _controller.getCurrentMintLimit(_connector);

        assertTrue(mintLimitBefore < _mintMaxLimit, "full limit avail");
        assertTrue(
            mintLimitBefore + time * _mintRate > _mintMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 mintLimitAfter = _controller.getCurrentMintLimit(_connector);
        assertEq(mintLimitAfter, _mintMaxLimit, "mint limit sus");
    }

    function testMintPendingConnectorUnavail() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.expectRevert(Controller.ConnectorUnavailable.selector);
        _controller.mintPendingFor(_raju, _wrongConnector);
    }

    function testFullConsumeMintPending() external {
        _setLimits();
        uint256 depositAmount = 120 ether;
        uint256 time = 200;

        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, depositAmount));

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = _controller.pendingMints(
            _connector,
            _raju
        );
        uint256 connectorPendingMintsBefore = _controller.connectorPendingMints(
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
        _controller.mintPendingFor(_raju, _connector);

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = _controller.pendingMints(_connector, _raju);
        uint256 connectorPendingMintsAfter = _controller.connectorPendingMints(
            _connector
        );

        assertEq(totalMintedAfter, depositAmount, "total minted after sus");
        assertEq(rajuBalAfter, depositAmount, "raju bal after sus");
        assertEq(pendingMintsAfter, 0, "pending mint after sus");
        assertEq(connectorPendingMintsAfter, 0, "total pending mint after sus");
    }

    function testPartConsumeMintPending() external {
        _setLimits();
        uint256 depositAmount = 120 ether;
        uint256 time = 5;
        deal(address(_token), address(_controller), depositAmount, true);

        vm.prank(_connector);
        _controller.receiveInbound(abi.encode(_raju, depositAmount));

        uint256 totalMintedBefore = _controller.totalMinted();
        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 pendingMintsBefore = _controller.pendingMints(
            _connector,
            _raju
        );
        uint256 connectorPendingMintsBefore = _controller.connectorPendingMints(
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
        _controller.mintPendingFor(_raju, _connector);

        uint256 totalMintedAfter = _controller.totalMinted();
        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 pendingMintsAfter = _controller.pendingMints(_connector, _raju);
        uint256 connectorPendingMintsAfter = _controller.connectorPendingMints(
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
