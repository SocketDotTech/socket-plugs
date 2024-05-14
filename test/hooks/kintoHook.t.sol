pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
// import "../../contracts/supertoken/SuperToken.sol";
import "../mocks/MockSocket.sol";
import "../../contracts/hooks/KintoHook.sol";
import "forge-std/console.sol";
import "../../contracts/hooks/plugins/ExecutionHelper.sol";

interface KintoID {
    function addSanction(address, uint16) external;
    function hasRole(bytes32, address) external view returns (bool);
    function balanceOf(address) external view returns (uint256);
}

interface KintoWallet {
    function setFunderWhitelist(address[] calldata, bool[] calldata) external;
}

contract TestKintoHook is Test {
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
    KintoHook kintoHook__;
    address _socket;
    address controller__;
    address kintoId__;
    address kintoFactory__;
    address kintoWallet__;
    address kintoWalletSigner__; // 1st signer of the kinto wallet
    uint32 _siblingSlug;
    uint32 _siblingSlug1;
    uint32 _siblingSlug2;
    uint32 _otherSiblingSlug;
    ExecutionHelper _executionHelper;

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    function setUp() external {
        
        uint256 kintoFork = vm.createSelectFork("kinto_devnet");

        vm.startPrank(_admin);

        _socket = address(uint160(_c++));
        controller__ = address(uint160(_c++));
        kintoId__ = 0x4cA8415fda5Bd4EC9350Ede22eb8071f9970C7f2;
        kintoFactory__ = 0xc16fBF31C98B15117208956D045B45153f1C9949;
        kintoWallet__ = 0x96c83CA216Dbb29e1dB4C9122691D4610AF53f18;
        kintoWalletSigner__ = 0x1dBDF0936dF26Ba3D7e4bAA6297da9FE2d2428c2;
        _siblingSlug1 = uint32(_c++);
        _siblingSlug2 = uint32(_c++);

        kintoHook__ = new KintoHook(_admin, controller__, false, kintoId__, kintoFactory__);
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
        kintoHook__.grantRole(LIMIT_UPDATER_ROLE, _admin);

        vm.prank(_admin);
        kintoHook__.updateLimitParams(u);
        skip(_bootstrapTime);
    }

    function testUpdateLimitParams() external {
        _setLimits();

        LimitParams memory burnLimitParams = kintoHook__.getSendingLimitParams(
            _connector1
        );
        LimitParams memory mintLimitParams = kintoHook__
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
        kintoHook__.updateLimitParams(u);
    }

    ////// START: KintoHook:srcPreHook tests //////

    function testsrcPreHookCallSenderNotKintoWallet() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        address sender = address(0xfede);
        address receiver = address(0xfede);

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        vm.expectRevert(abi.encodeWithSelector(KintoHook.InvalidSender.selector, sender));
        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallSenderNotKYCd() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        address sender = kintoWallet__;
        address receiver = address(0xfede);

        // revoke KYC to sender
        vm.prank(kintoWalletSigner__);
        KintoID(kintoId__).addSanction(kintoWalletSigner__, 1);

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        vm.expectRevert(KintoHook.KYCRequired.selector);
        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallReceiverNotAllowed() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        address sender = kintoWallet__;
        address receiver = address(0xfede);

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        vm.expectRevert(abi.encodeWithSelector(KintoHook.ReceiverNotAllowed.selector, receiver));
        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallReceiverIsKintoWalletSigner() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        address sender = kintoWallet__;
        address receiver = kintoWalletSigner__;

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCallReceiverAllowed() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        address sender = kintoWallet__;
        address receiver = address(0xfede);

        // whitelist the receiver
        address[] memory whitelist = new address[](1);
        whitelist[0] = receiver;
        bool[] memory flags = new bool[](1);
        flags[0] = true;

        vm.prank(kintoWallet__);
        KintoWallet(kintoWallet__).setFunderWhitelist(whitelist, flags);

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    ////// FINISH: KintoHook:srcPreHook tests //////


    function testsrcPreHookCallSender() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;

        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(_admin);
        vm.expectRevert(NotAuthorized.selector);
        kintoHook__.srcPreHookCall(
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
        address sender = kintoWallet__;
        address receiver = kintoWalletSigner__;

        deal(address(_token), sender, dealAmount);
        deal(sender, _fees);

        vm.startPrank(controller__);

        vm.expectRevert(SiblingNotSupported.selector);
        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _otherConnector,
                address(sender),
                TransferInfo(receiver, withdrawAmount, bytes(""))
            )
        );
        vm.stopPrank();
    }

    function testsrcPreHookCall() external {
        _setLimits();
        uint256 withdrawAmount = 10 ether;
        address sender = kintoWallet__;
        address receiver = kintoWalletSigner__;

        uint256 burnLimitBefore = kintoHook__.getCurrentSendingLimit(
            _connector1
        );

        assertTrue(
            withdrawAmount <= kintoHook__.getCurrentSendingLimit(_connector1),
            "too big withdraw"
        );

        bytes memory payload = abi.encode(receiver, withdrawAmount);

        vm.startPrank(controller__);
        (
            TransferInfo memory transferInfo,
            bytes memory postSrcHookData
        ) = kintoHook__.srcPreHookCall(
                SrcPreHookCallParams(
                    _connector1,
                    address(sender),
                    TransferInfo(kintoWalletSigner__, withdrawAmount, payload)
                )
            );
        vm.stopPrank();

        uint256 burnLimitAfter = kintoHook__.getCurrentSendingLimit(
            _connector1
        );

        assertEq(
            burnLimitAfter,
            burnLimitBefore - transferInfo.amount,
            "burn limit sus"
        );
        assertEq(receiver, transferInfo.receiver, "receiver incorrect");
        assertEq(withdrawAmount, transferInfo.amount, "amount incorrect");
        assertEq(transferInfo.data, payload, "extra data incorrect");
    }

    function testsrcPostHookCall() external {
        uint256 amount = 10 ether;
        bytes memory payload = abi.encode(_raju, amount);
        vm.startPrank(controller__);
        TransferInfo memory transferInfo = kintoHook__.srcPostHookCall(
            SrcPostHookCallParams(
                _connector1,
                payload,
                bytes(""),
                TransferInfo(_raju, amount, payload)
            )
        );
        assertEq(transferInfo.data, payload, "extra data incorrect");
    }

    function testFullBurnLimitReplenish() external {
        _setLimits();

        uint256 withdrawAmount = 30 ether;
        uint256 time = 100;
        address sender = kintoWallet__;
        address receiver = kintoWalletSigner__;

        bytes memory payload = abi.encode(sender, withdrawAmount);
        vm.startPrank(controller__);

        kintoHook__.srcPreHookCall(
            SrcPreHookCallParams(
                _connector1,
                address(sender),
                TransferInfo(receiver, withdrawAmount, payload)
            )
        );
        vm.stopPrank();

        uint256 burnLimitBefore = kintoHook__.getCurrentSendingLimit(
            _connector1
        );

        assertTrue(burnLimitBefore < _burnMaxLimit, "full limit avail");
        assertTrue(
            burnLimitBefore + time * _burnRate > _burnMaxLimit,
            "not enough time"
        );

        skip(time);

        uint256 burnLimitAfter = kintoHook__.getCurrentSendingLimit(
            _connector1
        );
        assertEq(burnLimitAfter, _burnMaxLimit, "burn limit sus");
    }

    ////// START: KintoHook:dstPreHookCall tests //////

    function testdstPreHookCallReceiverNotKintoWallet() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = address(0xfede);

        vm.expectRevert(abi.encodeWithSelector(KintoHook.InvalidReceiver.selector, receiver));
        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );
    }

    function testdstPreHookCallReceiverNotKYCd() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        // revoke KYC to receiver
        vm.prank(kintoWalletSigner__);
        KintoID(kintoId__).addSanction(kintoWalletSigner__, 1);

        vm.expectRevert(KintoHook.KYCRequired.selector);
        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );
    }

    function testdstPreHookCallSenderNotAllowed() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = address(0xfede); // original sender from vault chain
        address receiver = kintoWallet__;

        vm.expectRevert(abi.encodeWithSelector(KintoHook.SenderNotAllowed.selector, sender));
        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );
    }

    function testdstPreHookCallCallSenderIsKintoWalletSigner() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );
    }

    function testdstPreHookCallCallSenderAllowed() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = address(0xfede); // original sender from vault chain
        address receiver = kintoWallet__;

        // whitelist the receiver
        address[] memory whitelist = new address[](1);
        whitelist[0] = sender;
        bool[] memory flags = new bool[](1);
        flags[0] = true;

        vm.prank(kintoWallet__);
        KintoWallet(kintoWallet__).setFunderWhitelist(whitelist, flags);

        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );
    }

    ////// FINISH: KintoHook:dstPreHookCall tests //////

    function testFullConsumeDstCall() external {
        _setLimits();
        uint256 depositAmount = 2 ether;
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );

        assertEq(transferInfo.amount, depositAmount, "depositAmount sus");
        assertEq(transferInfo.receiver, receiver, "raju address sus");

        assertEq(
            postHookData,
            abi.encode(depositAmount, 0),
            "postHookData sus"
        );
        vm.startPrank(controller__);
        CacheData memory cacheData = kintoHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                bytes(""),
                postHookData,
                TransferInfo(receiver, depositAmount, bytes(""))
            )
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(cacheData.connectorCache, abi.encode(0), "connectorCache sus");
    }

    function testPartConsumeDstCall() external {
        _setLimits();
        uint256 depositAmount = 110 ether;
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
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
        CacheData memory cacheData = kintoHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                bytes(""),
                postHookData,
                TransferInfo(receiver, depositAmount, bytes(""))
            )
        );

        assertEq(
            cacheData.identifierCache,
            abi.encode(receiver, pendingAmount, _connector1),
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
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        bytes memory connectorCacheBefore = abi.encode(
            connectorPendingAmountBefore
        );
        vm.startPrank(controller__);
        (
            bytes memory postHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.dstPreHookCall(
                DstPreHookCallParams(
                    _connector1,
                    bytes(""),
                    TransferInfo(receiver, depositAmount, abi.encode(sender))
                )
            );

        CacheData memory cacheData = kintoHook__.dstPostHookCall(
            DstPostHookCallParams(
                _connector1,
                _messageId,
                connectorCacheBefore,
                postHookData,
                TransferInfo(receiver, depositAmount, abi.encode(sender))
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
        address sender = kintoWalletSigner__; // original sender from vault chain
        address receiver = kintoWallet__;

        vm.startPrank(controller__);
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = kintoHook__.preRetryHook(
                PreRetryHookCallParams(
                    _connector1,
                    CacheData(
                        abi.encode(receiver, pendingAmount, _connector1),
                        abi.encode(pendingAmount)
                    )
                )
            );

        assertEq(
            postRetryHookData,
            abi.encode(receiver, pendingAmount, 0),
            "postHookData sus"
        );
        assertEq(transferInfo.receiver, receiver, "raju address sus");
        assertEq(transferInfo.amount, pendingAmount, "pending amount sus");
        assertEq(transferInfo.data, bytes(""), "raju address sus");

        // test 0 connector pendingAmount afterwards
        CacheData memory cacheData = kintoHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(receiver, pendingAmount, _connector1),
                    abi.encode(pendingAmount)
                )
            )
        );

        assertEq(cacheData.identifierCache, bytes(""), "identifierCache sus");
        assertEq(cacheData.connectorCache, abi.encode(0), "connectorCache sus");

        // test non 0 connector pendingAmount afterwards
        cacheData = kintoHook__.postRetryHook(
            PostRetryHookCallParams(
                _connector1,
                _messageId,
                postRetryHookData,
                CacheData(
                    abi.encode(receiver, pendingAmount, _connector1),
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
        ) = kintoHook__.preRetryHook(
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
        assertEq(transferInfo.data, bytes(""), "raju address sus");

        // test 0 connector pendingAmount before
        CacheData memory cacheData = kintoHook__.postRetryHook(
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
        cacheData = kintoHook__.postRetryHook(
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
