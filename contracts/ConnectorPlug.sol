// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./utils/RescueBase.sol";
import {ISocket} from "./interfaces/ISocket.sol";
import {IPlug} from "./interfaces/IPlug.sol";
import {IConnector} from "./interfaces/IConnector.sol";
import {IBridge} from "./interfaces/IBridge.sol";
import "./common/Errors.sol";

contract ConnectorPlug is IConnector, IPlug, RescueBase {
    IBridge public immutable bridge__;
    ISocket public immutable socket__;
    uint32 public immutable siblingChainSlug;
    bytes32 public immutable transmissionParams;
    uint256 public messageIdPart;

    event ConnectorPlugDisconnected();

    constructor(
        address bridge_,
        address socket_,
        uint32 siblingChainSlug_,
        bytes32 transmissionParams_
    ) AccessControl(msg.sender) {
        bridge__ = IBridge(bridge_);
        socket__ = ISocket(socket_);
        siblingChainSlug = siblingChainSlug_;
        transmissionParams = transmissionParams_;
        _grantRole(RESCUE_ROLE, msg.sender);
    }

    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory options_
    ) external payable override returns (bytes32 messageId_) {
        if (msg.sender != address(bridge__)) revert NotBridge();
        if (options_.length == 0) {
            return
                socket__.outbound{value: msg.value}(
                    siblingChainSlug,
                    msgGasLimit_,
                    bytes32(0),
                    transmissionParams,
                    payload_
                );
        } else {
            if (options_.length != 32) revert InvalidOptionsLength();
            bytes32 executionParams = abi.decode(options_, (bytes32));

            return
                socket__.outbound{value: msg.value}(
                    siblingChainSlug,
                    msgGasLimit_,
                    executionParams,
                    transmissionParams,
                    payload_
                );
        }
    }

    function inbound(
        uint32 siblingChainSlug_, // cannot be connected for any other slug, immutable variable
        bytes calldata payload_
    ) external payable override {
        if (msg.sender != address(socket__)) revert NotSocket();
        bridge__.receiveInbound(siblingChainSlug_, payload_);
    }

    /**
     * @notice this function calculates the fees needed to send the message to Socket.
     * @param msgGasLimit_ min gas limit needed at destination chain to execute the message.
     */
    function getMinFees(
        uint256 msgGasLimit_,
        uint256 payloadSize_
    ) external view returns (uint256 totalFees) {
        return
            socket__.getMinFees(
                msgGasLimit_,
                payloadSize_,
                bytes32(0),
                bytes32(0),
                siblingChainSlug,
                address(this)
            );
    }

    function connect(
        address siblingPlug_,
        address switchboard_
    ) external onlyOwner {
        messageIdPart =
            (uint256(socket__.chainSlug()) << 224) |
            (uint256(uint160(siblingPlug_)) << 64);

        socket__.connect(
            siblingChainSlug,
            siblingPlug_,
            switchboard_,
            switchboard_
        );
    }

    function disconnect() external onlyOwner {
        messageIdPart = 0;

        (
            ,
            address inboundSwitchboard,
            address outboundSwitchboard,
            ,

        ) = socket__.getPlugConfig(address(this), siblingChainSlug);

        socket__.connect(
            siblingChainSlug,
            address(0),
            inboundSwitchboard,
            outboundSwitchboard
        );

        emit ConnectorPlugDisconnected();
    }

    /**
     * @notice this function is used to calculate message id before sending outbound().
     * @return messageId
     */
    function getMessageId() external view returns (bytes32) {
        return bytes32(messageIdPart | (socket__.globalMessageCount()));
    }
}
