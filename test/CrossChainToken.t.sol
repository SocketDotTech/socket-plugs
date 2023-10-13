pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../src/CrossChainToken/CrossChainToken.sol";
import "../src/CrossChainToken/CrossChainConnector.sol";
contract TestCrossChainToken is Test {
    uint256 _c;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _wrongConnector = address(uint160(_c++));

    uint256 constant _burnMaxLimit = 200 ether;
    uint256 constant _burnRate = 2 ether;
    uint256 constant _mintMaxLimit = 100 ether;
    uint256 constant _mintRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    ERC20 _token;
    CrossChainToken _crossChainToken;
    
    function setUp() external {
        vm.startPrank(_admin);
        _crossChainToken = new CrossChainToken(
            "TestToken",
            "TT",
            18,
            _admin,
             _admin,
            100
        );
        _token = ERC20(address(_crossChainToken));
        vm.stopPrank();
    }

 function _setLimits() internal {
        CrossChainToken.UpdateLimitParams[]
            memory u = new CrossChainToken.UpdateLimitParams[](2);
        u[0] = CrossChainToken.UpdateLimitParams(
            true,
            _connector,
            _mintMaxLimit,
            _mintRate
        );
        u[1] = CrossChainToken.UpdateLimitParams(
            false,
            _connector,
            _burnMaxLimit,
            _burnRate
        );

        vm.prank(_admin);
        _crossChainToken.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        CrossChainToken.LimitParams memory burnLimitParams = _crossChainToken
            .getSendingLimitParams(_connector);
        CrossChainToken.LimitParams memory mintLimitParams = _crossChainToken
            .getReceivingLimitParams(_connector);

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
        CrossChainToken.UpdateLimitParams[]
            memory u = new CrossChainToken.UpdateLimitParams[](2);
        u[0] = CrossChainToken.UpdateLimitParams(
            true,
            _connector,
            _mintMaxLimit,
            _mintRate
        );
        u[1] = CrossChainToken.UpdateLimitParams(
            false,
            _connector,
            _burnMaxLimit,
            _burnRate
        );

        vm.prank(_raju);
        vm.expectRevert("UNAUTHORIZED");
        _crossChainToken.updateLimitParams(u);
    }

    function testBridgeToChainConnectorUnavail() external {
        uint256 sendingAmount = 2 ether;
        _setLimits();
        deal(_raju, _fees);
        vm.prank(_raju);
        vm.expectRevert(CrossChainToken.ConnectorUnavailable.selector);
        _crossChainToken.bridgeToChain{value: _fees}(
            _raju,
            sendingAmount,
            _msgGasLimit,
            _wrongConnector
        );
    }

    function testBridgeToChainMe() external {
        _setLimits();
        bytes32 messageIdMsg = bytes32(uint256(2));
        bytes32 messageId = bytes32(uint256(1));

        uint256 sendingAmount = 10 ether;
        vm.prank(_connector);
        _crossChainToken.receiveInbound(abi.encode(_raju, sendingAmount,messageIdMsg));
        deal(_raju, _fees);

        uint256 rajuBalBefore = _token.balanceOf(_raju);
        uint256 sendingLimitBefore = _crossChainToken.getCurrentSendingLimit(_connector);

        assertTrue(
            sendingAmount <= _crossChainToken.getCurrentReceivingLimit(_connector),
            "too big sending amount"
        );

        vm.startPrank(_raju);
        _token.approve(address(_crossChainToken), sendingAmount);

       
        vm.mockCall(
            _connector,
           abi.encodeWithSelector(CrossChainConnector.getMessageId.selector),
            abi.encode(messageId)
        );
        vm.mockCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, sendingAmount, messageId))
            ),
            abi.encode(messageId)
        );
        vm.expectCall(
            _connector,
            abi.encodeWithSelector(CrossChainConnector.getMessageId.selector)
        );
        vm.expectCall(
            _connector,
            abi.encodeCall(
                IConnector.outbound,
                (_msgGasLimit, abi.encode(_raju, sendingAmount, messageId))
            )
        );

        _crossChainToken.bridgeToChain{value: _fees}(
            _raju,
            sendingAmount,
            _msgGasLimit,
            _connector
        );
        vm.stopPrank();

        uint256 rajuBalAfter = _token.balanceOf(_raju);
        uint256 sendingLimitAfter = _crossChainToken.getCurrentSendingLimit(_connector);

        assertEq(
            rajuBalAfter,
            rajuBalBefore - sendingAmount,
            "raju balance sus"
        );

        assertEq(
            sendingLimitAfter,
            sendingLimitBefore - sendingAmount,
            "burn limit sus"
        );
    }
}