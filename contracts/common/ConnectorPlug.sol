pragma solidity 0.8.13;

import "../common/Ownable.sol";
import {ISocket} from "../interfaces/ISocket.sol";
import {IPlug} from "../interfaces/IPlug.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";

interface IConnector {
    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_
    ) external payable returns (bytes32 messageId_);

    function siblingChainSlug() external view returns (uint32);

    function getMinFees(
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees);

    function getMessageId() external view returns (bytes32);
}

contract ConnectorPlug is IConnector, IPlug, Ownable {
    IHub public immutable hub__;
    ISocket public immutable socket__;
    uint32 public immutable siblingChainSlug;
    uint256 public messageIdPart;

    error NotHub();
    error NotSocket();

    event ConnectorPlugDisconnected();

    constructor(
        address hub_,
        address socket_,
        uint32 siblingChainSlug_
    ) Ownable(msg.sender) {
        hub__ = IHub(hub_);
        socket__ = ISocket(socket_);
        siblingChainSlug = siblingChainSlug_;
    }

    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory
    ) external payable override returns (bytes32 messageId_) {
        if (msg.sender != address(hub__)) revert NotHub();

        return
            socket__.outbound{value: msg.value}(
                siblingChainSlug,
                msgGasLimit_,
                bytes32(0),
                bytes32(0),
                payload_
            );
    }

    function inbound(
        uint32 /* siblingChainSlug_ */, // cannot be connected for any other slug, immutable variable
        bytes calldata payload_
    ) external payable override {
        if (msg.sender != address(socket__)) revert NotSocket();
        hub__.receiveInbound(payload_);
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

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
