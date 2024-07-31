pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
// import "../../contracts/supertoken/SuperToken.sol";
import "../mocks/MockSocket.sol";
import "../../contracts/hooks/LimitHook.sol";
import "forge-std/console.sol";
import "../../contracts/hooks/plugins/ExecutionHelper.sol";

contract TestLimitHook is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _connector1 = address(uint160(_c++));
    address immutable _connector2 = address(uint160(_c++));
    address immutable _otherConnector = address(uint160(_c++));
    bytes32 immutable _messageId = bytes32(_c++);

    uint256 constant _burnMaxLimit = 200 ether;
    uint256 constant _burnRate = 2 ether;
    uint256 constant _mintMaxLimit = 100 ether;
    uint256 constant _mintRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    uint256 constant _initialSupply = 100000;
    uint256 constant _rajuInitialBal = 1000;
    mapping(address => bytes) connectorCache;
    MintableToken _token;
    LimitHook limitHook__;
    address _socket;
    address controller__;
    uint32 _siblingSlug;
    uint32 _siblingSlug1;
    uint32 _siblingSlug2;
    uint32 _otherSiblingSlug;
    ExecutionHelper _executionHelper;

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    function setUp() external {
        vm.startPrank(_admin);

        _socket = address(uint160(_c++));
        controller__ = address(uint160(_c++));
        _siblingSlug1 = uint32(_c++);
        _siblingSlug2 = uint32(_c++);

        limitHook__ = new LimitHook(_admin, controller__, false);
        _token = new MintableToken("Moon", "MOON", 18);
        _token.mint(_admin, _initialSupply);
        _token.mint(_raju, _rajuInitialBal);

        vm.stopPrank();
    }

    function _setLimits() internal {
        UpdateLimitParams[] memory u = new UpdateLimitParams[](4);
        u[0] = UpdateLimitParams(true, _connector1, _mintMaxLimit, _mintRate);
        u[1] = UpdateLimitParams(false, _connector1, _burnMaxLimit, _burnRate);

        u[2] = UpdateLimitParams(true, _connector2, _mintMaxLimit, _mintRate);
        u[3] = UpdateLimitParams(false, _connector2, _burnMaxLimit, _burnRate);

        vm.prank(_admin);
        limitHook__.grantRole(LIMIT_UPDATER_ROLE, _admin);

        vm.prank(_admin);
        limitHook__.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        LimitParams memory burnLimitParams = limitHook__.getSendingLimitParams(
            _connector1
        );
        LimitParams memory mintLimitParams = limitHook__
            .getReceivingLimitParams(_connector1);

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
        UpdateLimitParams[] memory u = new UpdateLimitParams[](2);
        u[0] = UpdateLimitParams(true, _connector1, _mintMaxLimit, _mintRate);
        u[1] = UpdateLimitParams(false, _connector1, _burnMaxLimit, _burnRate);

        vm.prank(_raju);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.NoPermit.selector,
                LIMIT_UPDATER_ROLE
            )
        );
        limitHook__.updateLimitParams(u);
    }

    function testsrcPreHookCallLimitHit() external {
        uint256 withdrawAmount = 201 ether;
        _setLimits();
        assertTrue(
            withdrawAmount > limitHook__.getCurrentSendingLimit(_connector1),
            "withdraw amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, withdrawAmount, true);
        deal(_raju, _fees);

        vm.startPrank(controller__);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        limitHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallSender() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(_admin);
        vm.expectRevert(NotAuthorized.selector);
        limitHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallSiblingNotSupported() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(controller__);

        vm.expectRevert(SiblingNotSupported.selector);
        limitHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCall() external {
        _setLimits();
        uint256 withdrawAmount = 10 ether;

        uint256 burnLimitBefore = limitHook__.getCurrentSendingLimit(
            _connector1
        );

        assertTrue(
            withdrawAmount <= limitHook__.getCurrentSendingLimit(_connector1),
            "too big withdraw"
        );

        bytes memory payload = abi.encode(_raju, withdrawAmount);

        vm.startPrank(controller__);
        (
            TransferInfo memory transferInfo,
            bytes memory postSrcHookData
        ) = limitHook__.srcPreHookCall(
                SrcPreHookCallParams(
                    _connector1,
                    address(_raju),
                    TransferInfo(_raju, withdrawAmount, payload)
                )
            );
        vm.stopPrank();

        uint256 burnLimitAfter = limitHook__.getCurrentSendingLimit(
            _connector1
        );

        assertEq(
            burnLimitAfter,
            burnLimitBefore - transferInfo.amount,
            "burn limit sus"
        );
        assertEq(_raju, transferInfo.receiver, "receiver incorrect");
        assertEq(withdrawAmount, transferInfo.amount, "amount incorrect");
        assertEq(transferInfo.extraData, payload, "extra data incorrect");
    }

    function testsrcPostHookCall() external {
        uint256 amount = 10 ether;
        bytes memory payload = abi.encode(_raju, amount);
        vm.startPrank(controller__);
        TransferInfo memory transferInfo = limitHook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector1,
                payload,
                bytes(""),
                TransferInfo(_raju, amount, payload)
            )
        );
        assertEq(transferInfo.extraData, payload, "extra data incorrect");
    }

    function testFullBurnLimitReplenish() external {
        _setLimits();

        uint256 withdrawAmount = 30 ether;
        uint256 time = 100;

        bytes memory payload = abi.encode(_raju, withdrawAmount);
        vm.startPrank(controller__);

        limitHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, payload)
            )
        );
        vm.stopPrank();

        uint256 burnLimitBefore = limitHook__.getCurrentSendingLimit(
            _connector1
        );

        assertTrue(burnLimitBefore < _burnMaxLimit, "full limit avail");
        assertTrue(
            burnLimitBefore + time * _burnRate > _burnMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 burnLimitAfter = limitHook__.getCurrentSendingLimit(
            _connector1
        );
        assertEq(burnLimitAfter, _burnMaxLimit, "burn limit sus");
    }

    function testFullConsumeDstCall() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = limitHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(_raju, depositAmount, bytes(""))
                )
            );

        assertEq(transferInfo.amount, depositAmount, "depositAmount sus");
        assertEq(transferInfo.receiver, _raju, "raju address sus");

        assertEq(
            postHookData,
            abi.encode(depositAmount, 0),
            "postHookData sus"
        );
        vm.startPrank(controller__);
        CacheData memory cacheData = limitHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                bytes(""),
                postHookData,
                TransferInfo(_raju, depositAmount, bytes(""))
            )
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(cacheData.connectorCache, abi.encode(0), "connectorCache sus");
    }

    function testPartConsumeDstCall() external {
        _setLimits();
        uint256 depositAmount = 110 ether;

        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = limitHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(_raju, depositAmount, bytes(""))
                )
            );
        assertTrue(depositAmount > _mintMaxLimit, "deposit amount not enough");
        assertEq(transferInfo.amount, _mintMaxLimit, "depositAmount sus");

        uint256 pendingAmount = depositAmount - _mintMaxLimit;
        assertEq(
            postHookData,
            abi.encode(_mintMaxLimit, pendingAmount),
            "postHookData sus"
        );
        vm.startPrank(controller__);
        CacheData memory cacheData = limitHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                bytes(""),
                postHookData,
                TransferInfo(_raju, depositAmount, bytes(""))
            )
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(_raju, pendingAmount, _connector1),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(pendingAmount),
            "connectorCache sus"
        );
    }

    function testPartConsumeDstCallConnectorCache() external {
        _setLimits();
        uint256 depositAmount = 110 ether;
        uint256 pendingAmount = depositAmount - _mintMaxLimit;
        uint256 connectorPendingAmountBefore = 10 ether;
        bytes memory connectorCacheBefore = abi.encode(
            connectorPendingAmountBefore
        );
        vm.startPrank(controller__);
        (bytes memory postHookData, ) = limitHook__.dstPreHookCall(
            DstPreHookCallParams(
                _connector1,
                bytes(""),
                TransferInfo(_raju, depositAmount, bytes(""))
            )
        );

        CacheData memory cacheData = limitHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                connectorCacheBefore,
                postHookData,
                TransferInfo(_raju, depositAmount, bytes(""))
            )
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(pendingAmount + connectorPendingAmountBefore),
            "connectorCache sus"
        );
    }

    function testFullConsumeRetryHookCall() external {
        _setLimits();
        uint256 pendingAmount = 2 ether;
        vm.startPrank(controller__);
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = limitHook__.preRetryHook(
                PreRetryHookCallParams(
                    _connector1,
                    CacheData(
                        abi.encode(_raju, pendingAmount, _connector1),
                        abi.encode(pendingAmount)
                    )
                )
            );

        assertEq(
            postRetryHookData,
            abi.encode(_raju, pendingAmount, 0),
            "postHookData sus"
        );
        assertEq(transferInfo.receiver, _raju, "raju address sus");
        assertEq(transferInfo.amount, pendingAmount, "pending amount sus");
        assertEq(transferInfo.extraData, bytes(""), "raju address sus");

        // test 0 connector pendingAmount afterwards
        CacheData memory cacheData = limitHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(_raju, pendingAmount, _connector1),
                    abi.encode(pendingAmount)
                )
            )
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(cacheData.connectorCache, abi.encode(0), "connectorCache sus");

        // test non 0 connector pendingAmount afterwards
        cacheData = limitHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(_raju, pendingAmount, _connector1),
                    abi.encode(pendingAmount + 10 ether)
                )
            )
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(10 ether),
            "connectorCache sus"
        );
    }

    function testPartConsumeRetryHookCall() external {
        _setLimits();
        uint256 pendingAmount = 200 ether;
        uint256 connectorAlreadyPendingAmount = 100 ether;
        vm.startPrank(controller__);
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = limitHook__.preRetryHook(
                PreRetryHookCallParams(
                    _connector1,
                    CacheData(
                        abi.encode(_raju, pendingAmount, _connector1),
                        abi.encode(
                            pendingAmount + connectorAlreadyPendingAmount
                        )
                    )
                )
            );

        assertEq(
            postRetryHookData,
            abi.encode(_raju, _mintMaxLimit, pendingAmount - _mintMaxLimit),
            "postHookData sus"
        );
        assertEq(transferInfo.receiver, _raju, "raju address sus");
        assertEq(transferInfo.amount, _mintMaxLimit, "pending amount sus");
        assertEq(transferInfo.extraData, bytes(""), "raju address sus");

        // test 0 connector pendingAmount before
        CacheData memory cacheData = limitHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(_raju, pendingAmount, _connector1),
                    abi.encode(pendingAmount)
                )
            )
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(_raju, pendingAmount - _mintMaxLimit, _connector1),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(pendingAmount - _mintMaxLimit),
            "connectorCache sus"
        );

        // test non 0 connector pendingAmount before
        cacheData = limitHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(_raju, pendingAmount),
                    abi.encode(pendingAmount + connectorAlreadyPendingAmount)
                )
            )
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(_raju, pendingAmount - _mintMaxLimit, _connector1),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(
                pendingAmount + connectorAlreadyPendingAmount - _mintMaxLimit
            ),
            "connectorCache sus"
        );
    }
}
