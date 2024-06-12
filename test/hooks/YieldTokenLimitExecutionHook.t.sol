pragma solidity 0.8.13;

import "forge-std/Test.sol";

import {YieldToken} from "../../contracts/token/yield-token/YieldToken.sol";
import "../mocks/hooks/MockYieldTokenHook.sol";

contract Setup is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _ramu = address(uint160(_c++));

    address immutable _connector = address(uint160(_c++));
    address immutable _otherConnector = address(uint160(_c++));
    address immutable _executionHelper = address(uint160(_c++));
    uint256 immutable _connectorPoolId = 1;

    // limits
    uint256 constant _burnMaxLimit = 200;
    uint256 constant _burnRate = 2;
    uint256 constant _mintMaxLimit = 100;
    uint256 constant _mintRate = 1;
    uint256 constant _bootstrapTime = 100;
    bytes32 constant messageId = bytes32(0);

    // yield token
    uint256 constant _initialSupply = 100000;
    uint256 constant _rajuInitialBal = 1000;

    // dl
    uint32 _slug = uint32(_c++);
    uint32 _siblingSlug1 = uint32(_c++);
    uint32 _siblingSlug2 = uint32(_c++);

    YieldToken yieldToken__;
    MockYieldTokenHook hook__;
    address _controller;
    address[] connectors;
    uint256[] poolIds;

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");
    bytes32 constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 constant HOOK_ROLE = keccak256("HOOK_ROLE");

    function setUp() external {
        vm.startPrank(_admin);
        yieldToken__ = new YieldToken("Moon", "MOON", 18);
        hook__ = new MockYieldTokenHook(
            address(yieldToken__),
            _controller,
            _executionHelper
        );
        yieldToken__.grantRole(MINTER_ROLE, _controller);
        yieldToken__.grantRole(HOOK_ROLE, address(hook__));

        connectors.push(_connector);
        poolIds.push(_connectorPoolId);
        hook__.updateConnectorPoolId(connectors, poolIds);

        _setLimits();
        vm.stopPrank();

        hoax(_controller);
        yieldToken__.mint(_raju, _initialSupply);
        _updateSiblingYield(_initialSupply);
        _updateTotalYield(_initialSupply);
    }

    function _setLimits() internal {
        UpdateLimitParams[] memory u = new UpdateLimitParams[](4);
        u[0] = UpdateLimitParams(true, _connector, _mintMaxLimit, _mintRate);
        u[1] = UpdateLimitParams(false, _connector, _burnMaxLimit, _burnRate);

        hook__.grantRole(LIMIT_UPDATER_ROLE, _admin);
        hook__.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function _updateSiblingYield(uint256 amount_) internal {
        hook__.updateSiblingYield(_connectorPoolId, amount_);
    }

    function _updateTotalYield(uint256 amount_) internal {
        hook__.updateTotalYield(amount_);
    }
}

contract TestController_YieldLimitExecHook is Setup {
    function testUpdateLimitParams() external {
        LimitParams memory burnLimitParams = hook__.getSendingLimitParams(
            _connector
        );
        LimitParams memory mintLimitParams = hook__.getReceivingLimitParams(
            _connector
        );

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
        u[0] = UpdateLimitParams(true, _connector, _mintMaxLimit, _mintRate);
        u[1] = UpdateLimitParams(false, _connector, _burnMaxLimit, _burnRate);

        vm.prank(_raju);
        vm.expectRevert(
            abi.encodeWithSelector(
                AccessControl.NoPermit.selector,
                LIMIT_UPDATER_ROLE
            )
        );
        hook__.updateLimitParams(u);
    }

    // src hooks
    function testSrcPreHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector,
                address(_raju),
                TransferInfo(_raju, 100, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testSrcPostHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector,
                bytes(""),
                abi.encode(100),
                TransferInfo(_raju, 0, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testSrcPreHookSiblingFundCheck() external {
        uint256 withdrawAmount = 100;

        vm.startPrank(_controller);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );

        // revert if not enough funds
        _updateSiblingYield(0);
        _updateTotalYield(0);

        vm.expectRevert(InsufficientFunds.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testSrcPreHookCallLimitHit() external {
        uint256 withdrawAmount = 201;

        assertTrue(
            withdrawAmount > hook__.getCurrentSendingLimit(_connector),
            "withdraw amount within limit"
        );

        vm.startPrank(_controller);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
    }

    function testSrcPreHookCallSiblingNotSupported() external {
        uint256 withdrawAmount = 10;

        hoax(_controller);
        vm.expectRevert(InvalidPoolId.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );

        hoax(_admin);
        connectors.push(_otherConnector);
        poolIds.push(_connectorPoolId + 1);
        hook__.updateConnectorPoolId(connectors, poolIds);

        hoax(_controller);
        vm.expectRevert(InsufficientFunds.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );

        hook__.updateSiblingYield(_connectorPoolId + 1, withdrawAmount);
        hoax(_controller);
        vm.expectRevert(SiblingNotSupported.selector);
        hook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(_raju),
                TransferInfo(_raju, withdrawAmount, bytes(""))
            )
        );
    }

    function testSrcPreHookCall() external {
        uint256 withdrawAmount = 10;
        uint256 updatedAmount = yieldToken__.convertToShares(withdrawAmount);
        bytes memory payload = bytes("");

        uint256 totalUnderlyingAssets = hook__.totalUnderlyingAssets();
        uint256 siblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        vm.startPrank(_controller);
        (
            TransferInfo memory transferInfo,
            bytes memory postSrcHookData
        ) = hook__.srcPreHookCall(
                SrcPreHookCallParams(
                    _connector,
                    address(_raju),
                    TransferInfo(_raju, withdrawAmount, payload)
                )
            );
        vm.stopPrank();

        uint256 newTotalYield = hook__.totalUnderlyingAssets();
        uint256 newSiblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            totalUnderlyingAssets - updatedAmount,
            newTotalYield,
            "total yield sus"
        );
        assertEq(
            siblingYield - updatedAmount,
            newSiblingYield,
            "new sibling yield sus"
        );
        assertEq(
            abi.encode(withdrawAmount),
            postSrcHookData,
            "post hook data sus"
        );
        assertEq(payload, transferInfo.extraData, "new transfer data sus");
        assertEq(updatedAmount, transferInfo.amount, "shares to amount sus");
    }

    function testSrcPostHookCall() external {
        uint256 amount = 10;
        bytes memory options = abi.encode(false);
        bytes memory postHookData = abi.encode(amount);

        vm.startPrank(_controller);
        TransferInfo memory transferInfo = hook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector,
                options,
                postHookData,
                TransferInfo(_raju, 0, bytes(""))
            )
        );

        assertEq(transferInfo.amount, amount, "amount sus");

        assertEq(transferInfo.amount, amount, "amount sus");
        assertEq(transferInfo.receiver, _raju, "receiver sus");

        bytes memory updatedPayload = abi.encode(options, bytes(""));
        assertEq(
            transferInfo.extraData,
            updatedPayload,
            "extra data incorrect"
        );
    }

    function testFullSrcHookCall() external {
        uint256 withdrawAmount = 10;
        bytes memory options = abi.encode(false);

        uint256 updatedAmount = yieldToken__.convertToShares(withdrawAmount);
        bytes memory payload = abi.encode(options, bytes(""));

        uint256 tokenYield = yieldToken__.totalUnderlyingAssets();
        uint256 totalUnderlyingAssets = hook__.totalUnderlyingAssets();
        uint256 siblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        vm.startPrank(_controller);
        (
            TransferInfo memory transferInfo,
            bytes memory postSrcHookData
        ) = hook__.srcPreHookCall(
                SrcPreHookCallParams(
                    _connector,
                    address(_raju),
                    TransferInfo(_raju, withdrawAmount, bytes(""))
                )
            );

        transferInfo = hook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector,
                options,
                postSrcHookData,
                transferInfo
            )
        );
        vm.stopPrank();

        uint256 newTokenYield = yieldToken__.totalUnderlyingAssets();
        uint256 newTotalYield = hook__.totalUnderlyingAssets();
        uint256 newSiblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            tokenYield - updatedAmount,
            newTokenYield,
            "token total yield sus"
        );
        assertEq(
            totalUnderlyingAssets - updatedAmount,
            newTotalYield,
            "total yield sus"
        );
        assertEq(
            siblingYield - updatedAmount,
            newSiblingYield,
            "new sibling yield sus"
        );
        assertEq(
            abi.encode(withdrawAmount),
            postSrcHookData,
            "post hook data sus"
        );
        assertEq(withdrawAmount, transferInfo.amount, "shares to amount sus");
        assertEq(payload, transferInfo.extraData, "new transfer data sus");
    }

    // dst hooks (limit and execution edge cases expected to be covered in their hooks)
    function testDstPreHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.dstPreHookCall(
            DstPreHookCallParams(
                _connector,
                bytes(""),
                TransferInfo(_raju, 100, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testDstPostHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector,
                messageId,
                bytes(""),
                bytes(""),
                TransferInfo(_raju, 0, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testDstPreHookForSync() external {
        uint256 amount = 100;
        bytes memory data = abi.encode((amount), bytes(""));
        uint256 totalUnderlyingAssets = hook__.totalUnderlyingAssets();
        uint256 siblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        vm.startPrank(_controller);
        (bytes memory postHookData, TransferInfo memory transferInfo) = hook__
            .dstPreHookCall(
                DstPreHookCallParams(
                    _connector,
                    bytes(""),
                    TransferInfo(address(0), 0, data)
                )
            );

        vm.stopPrank();

        uint256 newTotalYield = hook__.totalUnderlyingAssets();
        uint256 newSiblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        assertEq(
            totalUnderlyingAssets + amount,
            newTotalYield,
            "newTotalYield sus"
        );
        assertEq(siblingYield + amount, newSiblingYield, "newSiblingYield sus");

        assertEq(transferInfo.amount, 0, "depositAmount sus");
        assertEq(transferInfo.receiver, address(0), "receiver sus");
        assertEq(
            postHookData,
            abi.encode(0, 0, 0, address(0)),
            "post hook data sus"
        );
        assertEq(transferInfo.extraData, bytes(""), "data sus");
    }

    function testDstPostHookForSync() external {
        uint256 increasedUnderlying = 100;
        bytes memory data = abi.encode((increasedUnderlying), bytes(""));

        vm.startPrank(_controller);
        (bytes memory postHookData, TransferInfo memory transferInfo) = hook__
            .dstPreHookCall(
                DstPreHookCallParams(
                    _connector,
                    bytes(""),
                    TransferInfo(address(0), 0, data)
                )
            );

        CacheData memory cacheData = hook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector,
                messageId,
                abi.encode(0),
                postHookData,
                transferInfo
            )
        );
        vm.stopPrank();

        uint256 newTotalYield = yieldToken__.totalUnderlyingAssets();
        assertEq(
            increasedUnderlying + _initialSupply,
            newTotalYield,
            "newTotalYield sus"
        );
        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(cacheData.connectorCache, abi.encode(0), "connectorCache sus");
    }

    function testDstPreHookForDeposit() external {
        uint256 amount = 100;
        address receiver = _raju;
        bytes memory data = abi.encode((amount), bytes(""));
        uint256 totalUnderlyingAssets = hook__.totalUnderlyingAssets();
        uint256 siblingYield = hook__.poolLockedAmounts(_connectorPoolId);

        uint256 limit = hook__.getCurrentReceivingLimit(_connector);

        vm.startPrank(_controller);
        (bytes memory postHookData, TransferInfo memory transferInfo) = hook__
            .dstPreHookCall(
                DstPreHookCallParams(
                    _connector,
                    bytes(""),
                    TransferInfo(receiver, amount, data)
                )
            );

        vm.stopPrank();

        uint256 newTotalYield = hook__.totalUnderlyingAssets();
        uint256 newSiblingYield = hook__.poolLockedAmounts(_connectorPoolId);
        uint256 consumed = amount > limit ? amount - limit : amount;
        uint256 shares = yieldToken__.calculateMintAmount(consumed);

        assertEq(
            totalUnderlyingAssets + amount,
            newTotalYield,
            "newTotalYield sus"
        );
        assertEq(siblingYield + amount, newSiblingYield, "newSiblingYield sus");

        assertEq(transferInfo.receiver, receiver, "receiver sus");
        assertEq(
            postHookData,
            abi.encode(consumed, amount - consumed, amount, receiver),
            "post hook data sus"
        );
        assertEq(transferInfo.extraData, bytes(""), "data sus");
        assertEq(transferInfo.amount, shares, "depositAmount sus");
    }

    function testDstPostHookForDeposit() external {
        uint256 amount = 100;
        address receiver = _raju;
        bytes memory data = abi.encode((amount), bytes(""));

        vm.startPrank(_controller);
        (bytes memory postHookData, TransferInfo memory transferInfo) = hook__
            .dstPreHookCall(
                DstPreHookCallParams(
                    _connector,
                    bytes(""),
                    TransferInfo(receiver, amount, data)
                )
            );

        CacheData memory cacheData = hook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector,
                messageId,
                abi.encode(0),
                postHookData,
                transferInfo
            )
        );
        vm.stopPrank();

        (, uint256 pending, , ) = abi.decode(
            postHookData,
            (uint256, uint256, uint256, address)
        );
        uint256 newTotalYield = yieldToken__.totalUnderlyingAssets();

        assertEq(pending, 0, "pending sus");
        assertEq(amount + _initialSupply, newTotalYield, "newTotalYield sus");
        assertEq(
            cacheData.connectorCache,
            abi.encode(pending),
            "connectorCache sus"
        );
        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
    }

    // retry hooks
    function testRetryPreHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.preRetryHook(
            PreRetryHookCallParams(_connector, CacheData(bytes(""), bytes("")))
        );
        vm.stopPrank();
    }

    function testRetryPostHookCaller() external {
        vm.startPrank(_raju);
        vm.expectRevert(NotAuthorized.selector);
        hook__.postRetryHook(
            PostRetryHookCallParams(
                _connector,
                messageId,
                bytes(""),
                CacheData(bytes(""), bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testEmergencyShutdown() external {
        bool state = hook__.emergencyShutdown();
        assertFalse(state, "already shutdown");

        hoax(_admin);
        hook__.updateEmergencyShutdownState(true);

        bool newState = hook__.emergencyShutdown();
        assertTrue(newState, "not shutdown");

        // should not allow hook calls
        hoax(_controller);
        vm.expectRevert(VaultShutdown.selector);
        hook__.preRetryHook(
            PreRetryHookCallParams(_connector, CacheData(bytes(""), bytes("")))
        );
    }
}
