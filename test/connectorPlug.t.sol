pragma solidity ^0.8.13;

import "../lib/socket-protocol/test/SetupTest.t.sol";
import {ConnectorPlug, NotBridge} from "../contracts/ConnectorPlug.sol";
import {Controller} from "../contracts/bridge/Controller.sol";
import {MintableToken} from "./mocks/MintableToken.sol";

contract TestVault is MessageSwitchboardSetup {
    address immutable _raju = address(uint160(c++));
    uint256 constant _amount = 1 ether;

    ConnectorPlug arbPlug;
    MintableToken arbToken;
    Controller arbController;

    ConnectorPlug optPlug;
    MintableToken optToken;
    Controller optController;

    function setUp() external {
        _deploy();

        arbToken = new MintableToken("Moon", "MOON", 18);
        arbController = new Controller(address(arbToken));
        optToken = new MintableToken("Moon", "MOON", 18);
        optController = new Controller(address(optToken));

        arbPlug = new ConnectorPlug(
            address(arbConfig.socket),
            address(arbConfig.messageSwitchboard),
            address(arbController),
            optConfig.chainSlug
        );
        optPlug = new ConnectorPlug(
            address(optConfig.socket),
            address(optConfig.messageSwitchboard),
            address(optController),
            arbConfig.chainSlug
        );

        bool[] memory statuses = new bool[](1);
        statuses[0] = true;

        address[] memory connectors = new address[](1);
        connectors[0] = address(arbPlug);
        arbController.updateConnectorStatus(connectors, statuses);
        connectors[0] = address(optPlug);
        optController.updateConnectorStatus(connectors, statuses);

        arbPlug.registerSibling(optConfig.chainSlug, address(optPlug));
        optPlug.registerSibling(arbConfig.chainSlug, address(arbPlug));
    }

    function testNotBridgeSender() public {
        bytes memory options = "";
        bytes memory payload = abi.encode(_raju, _amount);

        vm.prank(_raju);
        vm.expectRevert(NotBridge.selector);
        arbPlug.outbound(msgSbGasLimit, payload, options);
    }

    function testBridge1() public {
        bytes memory options = "";
        bytes memory payload = abi.encode(
            _raju,
            _amount,
            bytes32(0),
            new bytes(0)
        );

        (
            uint40 payloadCounter,
            DigestParams memory digestParams
        ) = _getTriggerData(
                arbPlug,
                optPlug,
                arbConfig,
                optConfig,
                abi.encodeWithSelector(
                    ConnectorPlug.inbound.selector,
                    optConfig.chainSlug,
                    payload
                )
            );

        assertEq(optToken.balanceOf(_raju), 0);

        hoax(address(arbController));
        vm.expectEmit(true, true, true, true);
        emit TriggerProcessed(
            optConfig.chainSlug,
            msgSbFees,
            _createDigest(digestParams),
            digestParams
        );
        arbPlug.outbound{value: msgSbFees}(msgSbGasLimit, payload, options);

        _executeOnDestination(
            digestParams,
            digestParams.prevBatchDigestHash,
            payloadCounter
        );

        assertEq(optToken.balanceOf(_raju), _amount);
    }
}
