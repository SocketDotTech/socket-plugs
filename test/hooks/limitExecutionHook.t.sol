pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
// import "../../contracts/supertoken/SuperToken.sol";
import "../mocks/MockSocket.sol";
import "../../contracts/hooks/LimitExecutionHook.sol";
import "forge-std/console.sol";
import "../../contracts/utils/Gauge.sol";
import "../../contracts/hooks/plugins/ExecutionHelper.sol";

contract TestLimitExecutionHook is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _ramu = address(uint160(_c++));
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
    mapping(address => bytes) _connectorCache;
    MintableToken _token;
    LimitExecutionHook hook__;
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
        _executionHelper = new ExecutionHelper(_admin);
        hook__ = new LimitExecutionHook(
            _admin,
            address(controller__),
            address(_executionHelper),
            false
        );
        _executionHelper.setHook(address(hook__));
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
        hook__.grantRole(LIMIT_UPDATER_ROLE, _admin);

        vm.prank(_admin);
        hook__.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testsrcPreHookCallLimitHit() external {
        uint256 withdrawAmount = 201 ether;
        _setLimits();
        assertTrue(
            withdrawAmount > hook__.getCurrentSendingLimit(_connector1),
            "withdraw amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, withdrawAmount, true);
        deal(_raju, _fees);

        vm.startPrank(controller__);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        hook__.srcPreHookCall(
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
        hook__.srcPreHookCall(
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
        hook__.srcPreHookCall(
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

        uint256 burnLimitBefore = hook__.getCurrentSendingLimit(_connector1);

        assertTrue(
            withdrawAmount <= hook__.getCurrentSendingLimit(_connector1),
            "too big withdraw"
        );

        bytes memory payload = abi.encode(_raju, withdrawAmount);

        vm.startPrank(controller__);
        (TransferInfo memory transferInfo, ) = hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, payload)
            )
        );
        vm.stopPrank();

        uint256 burnLimitAfter = hook__.getCurrentSendingLimit(_connector1);

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
        TransferInfo memory transferInfo = hook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector1,
                payload,
                bytes(""),
                TransferInfo(_raju, amount, payload)
            )
        );
        assertEq(transferInfo.extraData, payload, "extra data incorrect");
        vm.stopPrank();
    }

    function testFullConsumeDstPreHookCall() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        bytes memory payload = bytes("");
        bytes memory connectorCache = abi.encode(10 ether);
        TransferInfo memory initialTransferInfo = TransferInfo(
            _raju,
            depositAmount,
            payload
        );
        vm.startPrank(controller__);
        (bytes memory postHookData, TransferInfo memory transferInfo) = hook__
            .dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    connectorCache,
                    initialTransferInfo
                )
            );

        assertEq(transferInfo.amount, depositAmount, "depositAmount sus");
        assertEq(transferInfo.receiver, _raju, "raju address sus");
        assertEq(
            postHookData,
            abi.encode(depositAmount, 0, depositAmount),
            "postHookData sus"
        );
        vm.stopPrank();
    }

    function testEmptyPayloadDstPostCall() external {
        // Full Consume
        uint256 depositAmount = 2 ether;
        uint256 pendingAmount = 0;
        uint256 consumedAmount = depositAmount;
        uint256 connectorPreviousPendingAmount = 10 ether;
        bytes memory payload = bytes("");

        CacheData memory cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            false
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );

        // Part Consume
        depositAmount = 200 ether;
        pendingAmount = depositAmount - _mintMaxLimit;
        consumedAmount = _mintMaxLimit;
        connectorPreviousPendingAmount = 10 ether;
        payload = bytes("");

        cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            false
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                pendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );
    }

    function testPayloadSuccessDstPostCall() external {
        // Full Consume
        uint256 depositAmount = 2 ether;
        uint256 pendingAmount = 0;
        uint256 consumedAmount = depositAmount;
        uint256 connectorPreviousPendingAmount = 10 ether;
        bytes memory payload = bytes("aaaaaaaa");

        CacheData memory cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            false
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );

        // Part Consume
        depositAmount = 200 ether;
        pendingAmount = depositAmount - _mintMaxLimit;
        consumedAmount = _mintMaxLimit;
        connectorPreviousPendingAmount = 10 ether;
        payload = bytes("aaaaaaaa");

        cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            false
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                pendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );
    }

    function testPayloadFailDstPostCall() external {
        // Full Consume
        uint256 depositAmount = 2 ether;
        uint256 pendingAmount = 0;
        uint256 consumedAmount = depositAmount;
        uint256 connectorPreviousPendingAmount = 10 ether;
        bytes memory payload = abi.encodeWithSignature("transfer()");

        CacheData memory cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            true
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                pendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );

        // Part Consume
        depositAmount = 200 ether;
        pendingAmount = depositAmount - _mintMaxLimit;
        consumedAmount = _mintMaxLimit;
        connectorPreviousPendingAmount = 10 ether;
        payload = abi.encodeWithSignature("transfer()");

        cacheData = _dstPostHookCall(
            depositAmount,
            consumedAmount,
            pendingAmount,
            connectorPreviousPendingAmount,
            payload,
            true
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                pendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorPreviousPendingAmount + pendingAmount),
            "connectorCache sus"
        );
    }

    function _dstPostHookCall(
        uint256 depositAmount,
        uint256 consumedAmount,
        uint256 pendingAmount,
        uint256 connectorPreviousPendingAmount,
        bytes memory payload,
        bool failExecution
    ) internal returns (CacheData memory cacheData) {
        _setLimits();
        bytes memory connectorCache = abi.encode(
            connectorPreviousPendingAmount
        );

        TransferInfo memory transferInfo = TransferInfo(
            _raju,
            depositAmount,
            payload
        );
        bytes memory postHookData = abi.encode(
            consumedAmount,
            pendingAmount,
            depositAmount
        );

        vm.startPrank(controller__);
        if (failExecution) {
            vm.mockCallRevert(
                transferInfo.receiver,
                payload,
                abi.encode("REVERT_MESSAGE")
            );
        }
        cacheData = hook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                connectorCache,
                postHookData,
                transferInfo
            )
        );
        vm.stopPrank();
    }

    function testFullConsumePreRetryHookCall() external {
        _setLimits();
        uint256 depositAmount = 10 ether;
        uint256 pendingAmount = 2 ether;
        uint256 connectorAlreadyPendingAmount = 10 ether;
        bytes memory payload = bytes("");

        vm.startPrank(controller__);
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = hook__.preRetryHook(
                PreRetryHookCallParams(
                    _connector1,
                    CacheData(
                        abi.encode(
                            _raju,
                            pendingAmount,
                            depositAmount,
                            _connector1,
                            payload
                        ),
                        abi.encode(
                            connectorAlreadyPendingAmount + pendingAmount
                        )
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
        vm.stopPrank();
    }

    function testPartConsumePreRetryHookCall() external {
        _setLimits();
        uint256 depositAmount = 210 ether;

        uint256 pendingAmount = 200 ether;
        uint256 connectorAlreadyPendingAmount = 10 ether;
        bytes memory payload = bytes("");

        vm.startPrank(controller__);
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = hook__.preRetryHook(
                PreRetryHookCallParams(
                    _connector1,
                    CacheData(
                        abi.encode(
                            _raju,
                            pendingAmount,
                            depositAmount,
                            _connector1,
                            payload
                        ),
                        abi.encode(
                            connectorAlreadyPendingAmount + pendingAmount
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
        vm.stopPrank();
    }

    function testEmptyPayloadPostRetryHookCall() external {
        // Full Consume
        uint256 depositAmount = 10 ether;
        uint256 pendingAmount = 2 ether;
        uint256 connectorAlreadyPendingAmount = 10 ether;
        uint256 consumedAmount = pendingAmount;
        uint256 finalPendingAmount = 0;
        bytes memory payload = bytes("");
        bytes memory postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        CacheData memory cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            false
        );
        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount),
            "connectorCache sus"
        );

        // Part consume
        depositAmount = 210 ether;
        pendingAmount = 200 ether;
        connectorAlreadyPendingAmount = 10 ether;
        consumedAmount = _mintMaxLimit;
        finalPendingAmount = pendingAmount - _mintMaxLimit;
        payload = bytes("");
        postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            false
        );
        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                finalPendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount + finalPendingAmount),
            "connectorCache sus"
        );
    }

    function testPayloadSuccessPostRetryHookCall() external {
        // Full Consume
        uint256 depositAmount = 10 ether;
        uint256 pendingAmount = 2 ether;
        uint256 connectorAlreadyPendingAmount = 10 ether;
        uint256 consumedAmount = pendingAmount;
        uint256 finalPendingAmount = 0;
        bytes memory payload = abi.encodeWithSignature("successCall()");
        bytes memory postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        CacheData memory cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            false
        );
        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount + finalPendingAmount),
            "connectorCache sus"
        );

        // Part consume
        pendingAmount = 200 ether;
        connectorAlreadyPendingAmount = 10 ether;
        consumedAmount = _mintMaxLimit;
        finalPendingAmount = pendingAmount - _mintMaxLimit;
        payload = abi.encodeWithSignature("successCall()");
        postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            false
        );
        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                finalPendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount + finalPendingAmount),
            "connectorCache sus"
        );
    }

    function testPayloadFailPostRetryHookCall() external {
        // Full Consume
        uint256 depositAmount = 10 ether;
        uint256 pendingAmount = 2 ether;
        uint256 connectorAlreadyPendingAmount = 10 ether;
        uint256 consumedAmount = pendingAmount;
        uint256 finalPendingAmount = 0;
        bytes memory payload = abi.encodeWithSignature("failureCall()");
        bytes memory postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        CacheData memory cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            true
        );
        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                finalPendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount + finalPendingAmount),
            "connectorCache sus"
        );

        // Part consume
        depositAmount = 210 ether;
        pendingAmount = 200 ether;
        connectorAlreadyPendingAmount = 10 ether;
        consumedAmount = _mintMaxLimit;
        finalPendingAmount = pendingAmount - _mintMaxLimit;
        postRetryHookData = abi.encode(
            _raju,
            consumedAmount,
            finalPendingAmount
        );
        cacheData = _postRetryHookCall(
            postRetryHookData,
            depositAmount,
            pendingAmount,
            connectorAlreadyPendingAmount,
            payload,
            true
        );
        assertEq(
            cacheData.identifierCache,
            abi.encode(
                _raju,
                finalPendingAmount,
                depositAmount,
                _connector1,
                payload
            ),
            "identifierCache sus"
        );
        assertEq(
            cacheData.connectorCache,
            abi.encode(connectorAlreadyPendingAmount + finalPendingAmount),
            "connectorCache sus"
        );
    }

    function _postRetryHookCall(
        bytes memory postRetryHookData_,
        uint256 depositAmount_,
        uint256 pendingAmount_,
        uint256 connectorAlreadyPendingAmount_,
        bytes memory execPayload_,
        bool failExecution_
    ) internal returns (CacheData memory cacheData) {
        _setLimits();

        vm.startPrank(controller__);
        if (failExecution_) {
            vm.mockCallRevert(
                _raju,
                execPayload_,
                abi.encode("REVERT_MESSAGE")
            );
        }
        cacheData = hook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData_,
                CacheData(
                    abi.encode(
                        _raju,
                        pendingAmount_,
                        depositAmount_,
                        _connector1,
                        execPayload_
                    ),
                    abi.encode(connectorAlreadyPendingAmount_ + pendingAmount_)
                )
            )
        );
        vm.stopPrank();
    }
}
