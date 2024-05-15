pragma solidity 0.8.13;
import "forge-std/Test.sol";
import "forge-std/console.sol";

import "../contracts/bridge/Controller.sol";
import {UpdateLimitParams} from "../contracts/common/Structs.sol";
import "openzeppelin-contracts/contracts/token/ERC20/IERC20.sol";
import {LyraTSADepositHook, LimitHook} from "../contracts/hooks/LyraTSAHooks.sol";
import "../contracts/bridge/Base.sol";

contract LyraTSAZapHookForkTest is Test {
    // forge test --match-contract TestFork --fork-url https://l2-prod-testnet-0eakp60405.t.conduit.xyz --fork-block-number 12233884

    address caller = 0xFDC28fA368c33DEC7853d63B65FC5Cfe01B212fc;
    address batchAcceptor = 0x1D6811553Aff8231aDd04A84F300b89E15D99EA4;
    address tokenRecipient = 0x6666fe8F577F202Ec729BF653ec25Af5403cbd76;
    address fallbackRecipient = 0x1111111111111111111111111111111111111111;
    IERC20 token = IERC20(0x7ef0873bBf91B8Ecac22c0e9466b17c6Cc14B1bd);
    IERC20 TSA = IERC20(0x79AC9B13810D31066Be547EdA46C40264b39397D);
    LyraTSADepositHook hook = LyraTSADepositHook(payable(0x55328b5036EB15DdCA2a91468F1C70Dcae29b7Ab));
    Controller public controller =
        Controller(0xbEc0B31bbfA62364EBF6e27454978E33c5d9F4eE);
    address connectorPlug = 0x8FF3f8bc7884fe59425F090d5ec6A570472DfF88;

    struct BridgingEvent {
        address connector;
        address sender;
        address receiver;
        uint256 amount;
        bytes32 messageId;
    }

    function setUp() external {}

    function testHookDepositsWhenNoPayloadProvided() external {
        _updateHookContract();

        vm.deal(address(hook), 1 ether);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 0);

        bytes
            memory calldataToSend = hex"c41f1f6c0000000000000000000000000000000000000000000000000000000000aa37dc000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000a000000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a764000000aa37dc8ff3f8bc7884fe59425f090d5ec6a570472dff88000000000000008600000000000000000000000000000000000000000000000000000000000000800000000000000000000000000000000000000000000000000000000000000000";
        vm.prank(caller);
        connectorPlug.call(calldataToSend);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 1e18);
    }

    function testHookWithdrawsTSAsAtomically() external {
        _updateHookContract();

        vm.deal(address(hook), 1 ether);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);

        vm.recordLogs();
        bytes
            memory calldataToSend = hex"c41f1f6c0000000000000000000000000000000000000000000000000000000000aa37dc000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a764000000aa37dc8ff3f8bc7884fe59425f090d5ec6a570472dff88000000000000009a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000006666fe8F577F202Ec729BF653ec25Af5403cbd760000000000000000000000005f675ab715BB9D712e4628E74c8e11B46867aCe3";
        vm.prank(caller);
        connectorPlug.call(calldataToSend);

        Vm.Log[] memory logs = vm.getRecordedLogs();

        BridgingEvent memory b;
        for (uint i = 0; i < logs.length; i++) {
            if (logs[i].emitter == 0xD0DEe9Fd4Cc1d2eCB4572c01cDC65603557cc506) {
                b = abi.decode(logs[i].data, (BridgingEvent));
                break;
            }
        }
        assertEq(b.receiver, tokenRecipient);
        assertEq(b.amount, 1e18);
        assertEq(b.connector, 0x5f675ab715BB9D712e4628E74c8e11B46867aCe3);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
    }

    function testHookFailsIfNoETHInHook() external {
        _updateHookContract();

        bytes
            memory calldataToSend = hex"c41f1f6c0000000000000000000000000000000000000000000000000000000000aa37dc000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a764000000aa37dc8ff3f8bc7884fe59425f090d5ec6a570472dff88000000000000009a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000006666fe8F577F202Ec729BF653ec25Af5403cbd760000000000000000000000005f675ab715BB9D712e4628E74c8e11B46867aCe3";
        vm.expectRevert("INSUFFICIENT_ETH_BALANCE");
        vm.prank(caller);
        connectorPlug.call(calldataToSend);
    }

    function testSendsToFallbackAddressInTheCaseOfInvalidConnector() external {
        _updateHookContract();

        vm.deal(address(hook), 1 ether);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 0);

        // very last byte changed (invalid connector address)
        bytes
            memory calldataToSend = hex"c41f1f6c0000000000000000000000000000000000000000000000000000000000aa37dc000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a764000000aa37dc8ff3f8bc7884fe59425f090d5ec6a570472dff88000000000000009a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000006666fe8F577F202Ec729BF653ec25Af5403cbd760000000000000000000000005f675ab715BB9D712e4628E74c8e11B46867aCe2";
        vm.prank(caller);
        connectorPlug.call(calldataToSend);

        // fallback recipient will be the one to have the token minted to them directly
        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 1e18);
    }

    function testSendsSharesToFallbackIfWithdrawalFails() external {
        _updateHookContract();

        // reset TSA withdrawal limit to 0
        _updateLimits(
            LimitHook(0xfeF7a0bF88bBAA9409485C6Fe343A4135D5E799f),
            0x5f675ab715BB9D712e4628E74c8e11B46867aCe3,
            0,
            0
        );
        // then set to something that will have 0 limit
        _updateLimits(
            LimitHook(0xfeF7a0bF88bBAA9409485C6Fe343A4135D5E799f),
            0x5f675ab715BB9D712e4628E74c8e11B46867aCe3,
            1,
            0
        );

        vm.deal(address(hook), 1 ether);

        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 0);
        assertEq(TSA.balanceOf(fallbackRecipient), 0);

        // very last byte changed (invalid connector address)
        bytes
            memory calldataToSend = hex"c41f1f6c0000000000000000000000000000000000000000000000000000000000aa37dc000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000e000000000000000000000000011111111111111111111111111111111111111110000000000000000000000000000000000000000000000000de0b6b3a764000000aa37dc8ff3f8bc7884fe59425f090d5ec6a570472dff88000000000000009a000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000000400000000000000000000000006666fe8F577F202Ec729BF653ec25Af5403cbd760000000000000000000000005f675ab715BB9D712e4628E74c8e11B46867aCe3";
        vm.prank(caller);
        connectorPlug.call(calldataToSend);

        // fallback recipient will be the one to have the vault shares sent to them (hook will mint token + deposit)
        assertEq(token.balanceOf(tokenRecipient), 3.2e18);
        assertEq(token.balanceOf(fallbackRecipient), 0);
        assertEq(TSA.balanceOf(fallbackRecipient), 1e18);
    }

    function _updateHookContract() internal {
        // Update hook
        hook = new LyraTSADepositHook(
            0x000000A94C901AA5d4da1157B2Dd1c4c6b69815e,
            0xbEc0B31bbfA62364EBF6e27454978E33c5d9F4eE,
            true
        );
        vm.startPrank(0x000000A94C901AA5d4da1157B2Dd1c4c6b69815e);

        (bool success, ) = 0xbEc0B31bbfA62364EBF6e27454978E33c5d9F4eE.call(
            abi.encodeWithSignature(
                "updateHook(address,bool)",
                address(hook),
                true
            )
        );
        assertTrue(success, "updateHook failed");

        // update connector poolIds
        address[] memory connectors = new address[](1);
        connectors[0] = 0x8FF3f8bc7884fe59425F090d5ec6A570472DfF88;
        uint256[] memory poolIds_ = new uint256[](1);
        poolIds_[
            0
        ] = 300749528249665590178224313442040528409305273634097553067152835846309150720;
        hook.updateConnectorPoolId(connectors, poolIds_);

        vm.stopPrank();

        // update limit params and fast forward
        _updateLimits(
            hook,
            0x8FF3f8bc7884fe59425F090d5ec6A570472DfF88,
            100000000000000000000000000,
            100000000000000000000000000
        );
        uint currentTime = block.timestamp;
        vm.warp(currentTime + 1);
    }

    function _updateLimits(
        LimitHook hook,
        address connector,
        uint limit,
        uint rate
    ) internal {
        vm.startPrank(0x000000A94C901AA5d4da1157B2Dd1c4c6b69815e);
        UpdateLimitParams[] memory updates = new UpdateLimitParams[](2);
        updates[0] = UpdateLimitParams(true, connector, limit, rate);
        updates[1] = UpdateLimitParams(false, connector, limit, rate);
        hook.updateLimitParams(updates);
        vm.stopPrank();
    }
}
