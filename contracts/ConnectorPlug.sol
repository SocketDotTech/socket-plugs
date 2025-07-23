// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./utils/RescueBase.sol";

import {MessagePlugBase} from "socket-protocol/contracts/protocol/base/MessagePlugBase.sol";
import {IConnector} from "./interfaces/IConnector.sol";
import {IBridge} from "./interfaces/IBridge.sol";
import "./common/Errors.sol";

interface IConnectorPlug {
    function inbound(
        uint32 siblingChainSlug,
        bytes calldata payload
    ) external payable;
}

contract ConnectorPlug is IConnector, MessagePlugBase, RescueBase {
    IBridge public immutable bridge__;
    uint32 public immutable siblingChainSlug;

    constructor(
        address socket_,
        address switchboard_,
        address bridge_,
        uint32 siblingChainSlug_
    ) MessagePlugBase(socket_, switchboard_) AccessControl(msg.sender) {
        bridge__ = IBridge(bridge_);
        siblingChainSlug = siblingChainSlug_;
        _grantRole(RESCUE_ROLE, msg.sender);
    }

    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory
    ) external payable override returns (bytes32 messageId_) {
        if (msg.sender != address(bridge__)) revert NotBridge();
        _setOverrides(abi.encode(siblingChainSlug, msgGasLimit_, uint256(0)));
        IConnectorPlug(address(socket__)).inbound{value: msg.value}(
            siblingChainSlug,
            payload_
        );

        return bytes32(0);
    }

    function inbound(
        uint32 siblingChainSlug_, // cannot be connected for any other slug, immutable variable
        bytes calldata payload_
    ) external payable {
        if (msg.sender != address(socket__)) revert NotSocket();
        bridge__.receiveInbound(siblingChainSlug_, payload_);
    }

    function getMessageId() external pure returns (bytes32) {
        return bytes32(0);
    }

    /**
     * @notice this function calculates the fees needed to send the message to Socket.
     */
    function getMinFees(
        uint256,
        uint256
    ) external view returns (uint256 totalFees) {
        return getSocketFees(siblingChainSlug);
    }

    function connect(address siblingPlug_, address) external onlyOwner {
        registerSibling(siblingChainSlug, siblingPlug_);
    }

    function disconnect() external onlyOwner {
        registerSibling(siblingChainSlug, address(0));
        emit ConnectorPlugDisconnected();
    }
}
