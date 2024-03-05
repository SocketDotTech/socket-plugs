pragma solidity 0.8.13;

import "forge-std/Test.sol";
import "solmate/tokens/ERC20.sol";
import "../mocks/MintableToken.sol";
// import "../../contracts/supertoken/SuperToken.sol";
import "../mocks/MockSocket.sol";
import "../../contracts/hooks/LimitHook.sol";
import "../../contracts/common/structs.sol";
import "../../contracts/common/errors.sol";

contract TestSuperTokenLimits is Test {
    uint256 _c = 1000;
    address immutable _admin = address(uint160(_c++));
    address immutable _raju = address(uint160(_c++));
    address immutable _connector = address(uint160(_c++));
    address immutable _connector1 = address(uint160(_c++));
    address immutable _connector2 = address(uint160(_c++));
    address immutable _otherConnector = address(uint160(_c++));
    uint256 constant _burnMaxLimit = 200 ether;
    uint256 constant _burnRate = 2 ether;
    uint256 constant _mintMaxLimit = 100 ether;
    uint256 constant _mintRate = 1 ether;
    uint256 constant _fees = 0.001 ether;
    uint256 constant _msgGasLimit = 200_000;
    uint256 constant _bootstrapTime = 100;
    uint256 constant _initialSupply = 100000;
    uint256 constant _rajuInitialBal = 1000;

    MintableToken _token;
    LimitHook limitHook__;
    address _socket;
    address vaultOrToken__;
    uint32 _siblingSlug;
    uint32 _siblingSlug1;
    uint32 _siblingSlug2;
    uint32 _otherSiblingSlug;

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    function setUp() external {
        vm.startPrank(_admin);

        _socket = address(uint160(_c++));
        vaultOrToken__ = address(uint160(_c++));
        _siblingSlug1 = uint32(_c++);
        _siblingSlug2 = uint32(_c++);

        limitHook__ = new LimitHook(_admin, vaultOrToken__);
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

        LimitHook.LimitParams memory burnLimitParams = limitHook__
            .getSendingLimitParams(_connector1);
        LimitHook.LimitParams memory mintLimitParams = limitHook__
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

    function testSrcHookCallLimitHit() external {
        uint256 withdrawAmount = 201 ether;
        _setLimits();
        assertTrue(
            withdrawAmount > limitHook__.getCurrentSendingLimit(_connector1),
            "withdraw amount within limit"
        );

        vm.prank(_admin);
        deal(address(_token), _raju, withdrawAmount, true);
        deal(_raju, _fees);

        vm.startPrank(vaultOrToken__);
        vm.expectRevert(Gauge.AmountOutsideLimit.selector);
        limitHook__.srcHookCall(
            _raju,
            withdrawAmount,
            _siblingSlug1,
            _connector1,
            address(_raju),
            bytes("")
        );
        vm.stopPrank();
    }

    function testSrcHookCallSender() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(_admin);
        vm.expectRevert(NotAuthorized.selector);
        limitHook__.srcHookCall(
            _raju,
            withdrawAmount,
            _otherSiblingSlug,
            _otherConnector,
            address(_raju),
            bytes("")
        );
        vm.stopPrank();
    }

    function testSrcHookCallSiblingNotSupported() external {
        _setLimits();

        uint256 withdrawAmount = 10 ether;
        uint256 dealAmount = 10 ether;
        deal(address(_token), _raju, dealAmount);
        deal(_raju, _fees);

        vm.startPrank(vaultOrToken__);

        vm.expectRevert(SiblingNotSupported.selector);
        limitHook__.srcHookCall(
            _raju,
            withdrawAmount,
            _otherSiblingSlug,
            _otherConnector,
            address(_raju),
            bytes("")
        );
        vm.stopPrank();
    }

    function testSrcHookCall() external {
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

        vm.startPrank(vaultOrToken__);
        (
            address updatedReceiver,
            uint256 updatedAmount,
            bytes memory updatedExtraData
        ) = limitHook__.srcHookCall(
                _raju,
                withdrawAmount,
                _siblingSlug1,
                _connector1,
                address(_raju),
                payload
            );
        vm.stopPrank();

        uint256 burnLimitAfter = limitHook__.getCurrentSendingLimit(
            _connector1
        );

        assertEq(
            burnLimitAfter,
            burnLimitBefore - withdrawAmount,
            "burn limit sus"
        );
        assertEq(updatedReceiver, _raju, "receiver incorrect");
        assertEq(updatedAmount, withdrawAmount, "amount incorrect");
        assertEq(updatedExtraData, payload, "extra data incorrect");
    }

    // function testFullBurnLimitReplenish() external {
    //     _setLimits();

    //     uint256 usedLimit = 30 ether;
    //     uint256 time = 100;
    //     deal(_raju, _fees);
    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(_siblingSlug1, abi.encode(_raju, usedLimit, bytes32(0)));

    //     bytes32 messageId = bytes32(
    //         (uint256(_siblingSlug) << 224) |
    //             (uint256(uint160(address(0))) << 64) |
    //             (0)
    //     );
    //     bytes memory payload = abi.encode(_raju, usedLimit, messageId);
    //     vm.startPrank(_raju);
    //     vm.mockCall(
    //         _socket,
    //         abi.encodeCall(ISocket.globalMessageCount, ()),
    //         abi.encode(0)
    //     );
    //     vm.mockCall(
    //         _socket,
    //         _fees,
    //         abi.encodeCall(
    //             ISocket.outbound,
    //             (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
    //         ),
    //         abi.encode(messageId)
    //     );
    //     vm.expectCall(
    //         _socket,
    //         _fees,
    //         abi.encodeCall(
    //             ISocket.outbound,
    //             (_siblingSlug1, _msgGasLimit, bytes32(0), bytes32(0), payload)
    //         )
    //     );

    //     _token.bridge{value: _fees}(
    //         _raju,
    //         _siblingSlug1,
    //         usedLimit,
    //         _msgGasLimit,
    //         bytes("")
    //     );
    //     vm.stopPrank();

    //     uint256 burnLimitBefore = limitHook__.getCurrentSendingLimit(_connector1);

    //     assertTrue(burnLimitBefore < _burnMaxLimit, "full limit avail");
    //     assertTrue(
    //         burnLimitBefore + time * _burnRate > _burnMaxLimit,
    //         "not enough time"
    //     );

    //     skip(time);

    //     uint256 burnLimitAfter = limitHook__.getCurrentSendingLimit(_connector1);
    //     assertEq(burnLimitAfter, _burnMaxLimit, "burn limit sus");
    // }

    // function testFullConsumeInboundReceive() external {
    //     _setLimits();
    //     uint256 depositAmount = 2 ether;
    //     deal(address(_token), address(_token), depositAmount, true);

    //     uint256 totalSupplyBefore = _token.totalSupply();
    //     uint256 rajuBalBefore = _token.balanceOf(_raju);
    //     uint256 pendingMintsBefore = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsBefore = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );
    //     uint256 mintLimitBefore = limitHook__.getCurrentReceivingLimit(
    //         _siblingSlug1
    //     );

    //     assertTrue(depositAmount <= mintLimitBefore, "limit hit");

    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, depositAmount, bytes32(""))
    //     );

    //     uint256 totalSupplyAfter = _token.totalSupply();
    //     uint256 rajuBalAfter = _token.balanceOf(_raju);
    //     uint256 pendingMintsAfter = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsAfter = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );
    //     uint256 mintLimitAfter = limitHook__.getCurrentReceivingLimit(_siblingSlug1);

    //     assertEq(
    //         totalSupplyAfter,
    //         totalSupplyBefore + depositAmount,
    //         "total minted sus"
    //     );
    //     assertEq(
    //         rajuBalAfter,
    //         rajuBalBefore + depositAmount,
    //         "raju balance sus"
    //     );
    //     assertEq(pendingMintsAfter, pendingMintsBefore, "pending mints sus");
    //     assertEq(
    //         siblingPendingMintsAfter,
    //         siblingPendingMintsBefore,
    //         "total pending amount sus"
    //     );
    //     assertEq(
    //         mintLimitAfter,
    //         mintLimitBefore - depositAmount,
    //         "mint limit sus"
    //     );
    // }

    // function testPartConsumeInboundReceive() external {
    //     _setLimits();
    //     uint256 depositAmount = 110 ether;
    //     deal(address(_token), address(_token), depositAmount, true);

    //     uint256 totalSupplyBefore = _token.totalSupply();
    //     uint256 rajuBalBefore = _token.balanceOf(_raju);
    //     uint256 pendingMintsBefore = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsBefore = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );
    //     uint256 mintLimitBefore = limitHook__.getCurrentReceivingLimit(
    //         _siblingSlug1
    //     );

    //     assertTrue(mintLimitBefore > 0, "no mint limit available");
    //     assertTrue(depositAmount > mintLimitBefore, "mint not partial");

    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, depositAmount, bytes32(0), bytes(""))
    //     );

    //     uint256 totalSupplyAfter = _token.totalSupply();
    //     uint256 rajuBalAfter = _token.balanceOf(_raju);
    //     uint256 pendingMintsAfter = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsAfter = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );
    //     uint256 mintLimitAfter = limitHook__.getCurrentReceivingLimit(_siblingSlug1);

    //     assertEq(
    //         totalSupplyAfter,
    //         totalSupplyBefore + mintLimitBefore,
    //         "total minted sus"
    //     );
    //     assertEq(
    //         rajuBalAfter,
    //         rajuBalBefore + mintLimitBefore,
    //         "raju balance sus"
    //     );
    //     assertEq(
    //         pendingMintsAfter,
    //         pendingMintsBefore + depositAmount - mintLimitBefore,
    //         "pending mints sus"
    //     );
    //     assertEq(
    //         siblingPendingMintsAfter,
    //         siblingPendingMintsBefore + depositAmount - mintLimitBefore,
    //         "total pending amount sus"
    //     );
    //     assertEq(mintLimitAfter, 0, "mint limit sus");
    // }

    // function testPartMintLimitReplenish() external {
    //     _setLimits();

    //     uint256 usedLimit = 20 ether;
    //     uint256 time = 10;
    //     deal(address(_token), address(_token), usedLimit, true);

    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, usedLimit, bytes32(0), bytes(""))
    //     );

    //     uint256 mintLimitBefore = limitHook__.getCurrentReceivingLimit(
    //         _siblingSlug1
    //     );

    //     assertTrue(mintLimitBefore < _mintMaxLimit, "full limit avail");
    //     assertTrue(
    //         mintLimitBefore + time * _mintRate < _mintMaxLimit,
    //         "too much time"
    //     );

    //     skip(time);

    //     uint256 mintLimitAfter = limitHook__.getCurrentReceivingLimit(_siblingSlug1);
    //     assertEq(
    //         mintLimitAfter,
    //         mintLimitBefore + time * _mintRate,
    //         "mint limit sus"
    //     );
    // }

    // function testFullMintLimitReplenish() external {
    //     _setLimits();

    //     uint256 usedLimit = 20 ether;
    //     uint256 time = 100;
    //     deal(address(_token), address(_token), usedLimit, true);
    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, usedLimit, bytes32(0), bytes(""))
    //     );

    //     uint256 mintLimitBefore = limitHook__.getCurrentReceivingLimit(
    //         _siblingSlug1
    //     );

    //     assertTrue(mintLimitBefore < _mintMaxLimit, "full limit avail");
    //     assertTrue(
    //         mintLimitBefore + time * _mintRate > _mintMaxLimit,
    //         "not enough time"
    //     );

    //     skip(time);

    //     uint256 mintLimitAfter = limitHook__.getCurrentReceivingLimit(_siblingSlug1);
    //     assertEq(mintLimitAfter, _mintMaxLimit, "mint limit sus");
    // }

    // function testFullConsumeMintPending() external {
    //     _setLimits();

    //     uint256 depositAmount = 120 ether;
    //     uint256 time = 200;

    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, depositAmount, bytes32(0), bytes(""))
    //     );

    //     uint256 totalSupplyBefore = _token.totalSupply();
    //     uint256 rajuBalBefore = _token.balanceOf(_raju);
    //     uint256 pendingMintsBefore = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsBefore = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );

    //     assertEq(
    //         totalSupplyBefore,
    //         _mintMaxLimit + _initialSupply,
    //         "total minted before sus"
    //     );
    //     assertEq(
    //         rajuBalBefore,
    //         _mintMaxLimit + _rajuInitialBal,
    //         "raju bal before sus"
    //     );
    //     assertEq(
    //         pendingMintsBefore,
    //         depositAmount - _mintMaxLimit,
    //         "pending mint before sus"
    //     );
    //     assertEq(
    //         siblingPendingMintsBefore,
    //         depositAmount - _mintMaxLimit,
    //         "total pending mint before sus"
    //     );
    //     assertTrue(
    //         time * _mintRate > depositAmount - _mintMaxLimit,
    //         "not enough time"
    //     );

    //     skip(time);
    //     _token.mintPendingFor(_raju, _siblingSlug1, bytes32(0));

    //     uint256 totalSupplyAfter = _token.totalSupply();
    //     uint256 rajuBalAfter = _token.balanceOf(_raju);
    //     uint256 pendingMintsAfter = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsAfter = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );

    //     assertEq(
    //         totalSupplyAfter,
    //         depositAmount + _initialSupply,
    //         "total minted after sus"
    //     );
    //     assertEq(
    //         rajuBalAfter,
    //         depositAmount + _rajuInitialBal,
    //         "raju bal after sus"
    //     );
    //     assertEq(pendingMintsAfter, 0, "pending mint after sus");
    //     assertEq(siblingPendingMintsAfter, 0, "total pending mint after sus");
    // }

    // function testPartConsumeMintPending() external {
    //     _setLimits();
    //     uint256 depositAmount = 120 ether;
    //     uint256 time = 5;
    //     deal(address(_token), address(_token), depositAmount, true);

    //     vm.prank(address(superTokenPlug));
    //     _token.inbound(
    //         _siblingSlug1,
    //         abi.encode(_raju, depositAmount, bytes32(0), bytes(""))
    //     );

    //     uint256 totalSupplyBefore = _token.totalSupply();
    //     uint256 rajuBalBefore = _token.balanceOf(_raju);
    //     uint256 pendingMintsBefore = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsBefore = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );
    //     uint256 newMint = time * _mintRate;

    //     assertEq(
    //         totalSupplyBefore,
    //         _mintMaxLimit + _initialSupply + depositAmount,
    //         "total minted before sus"
    //     );
    //     assertEq(
    //         rajuBalBefore,
    //         _mintMaxLimit + _rajuInitialBal,
    //         "raju bal before sus"
    //     );
    //     assertEq(
    //         pendingMintsBefore,
    //         depositAmount - _mintMaxLimit,
    //         "pending mint before sus"
    //     );
    //     assertEq(
    //         siblingPendingMintsBefore,
    //         depositAmount - _mintMaxLimit,
    //         "total pending mint before sus"
    //     );
    //     assertTrue(depositAmount - _mintMaxLimit > 0, "what to mint?");

    //     assertTrue(newMint < depositAmount - _mintMaxLimit, "too much time");

    //     skip(time);
    //     _token.mintPendingFor(_raju, _siblingSlug1, bytes32(0));

    //     uint256 totalSupplyAfter = _token.totalSupply();
    //     uint256 rajuBalAfter = _token.balanceOf(_raju);
    //     uint256 pendingMintsAfter = _token.pendingMints(
    //         _siblingSlug1,
    //         _raju,
    //         bytes32(0)
    //     );
    //     uint256 siblingPendingMintsAfter = _token.siblingPendingMints(
    //         _siblingSlug1
    //     );

    //     assertEq(
    //         totalSupplyAfter,
    //         _mintMaxLimit + newMint + _initialSupply + depositAmount,
    //         "total minted after sus"
    //     );
    //     assertEq(
    //         rajuBalAfter,
    //         _mintMaxLimit + newMint + _rajuInitialBal,
    //         "raju bal after sus"
    //     );
    //     assertEq(
    //         pendingMintsAfter,
    //         depositAmount - _mintMaxLimit - newMint,
    //         "pending mint after sus"
    //     );
    //     assertEq(
    //         siblingPendingMintsAfter,
    //         depositAmount - _mintMaxLimit - newMint,
    //         "total pending mint after sus"
    //     );
    // }
}
