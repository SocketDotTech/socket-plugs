// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import {ISocket} from "../../interfaces/ISocket.sol";
import {IPlug} from "../../interfaces/IPlug.sol";
import {AccessControl} from "../../common/AccessControl.sol";
import {RescueFundsLib} from "../../libraries/RescueFundsLib.sol";
import {IMessageBridge} from "../interfaces/IMessageBridge.sol";
import {ISuperTokenOrVault} from "../interfaces/ISuperTokenOrVault.sol";

/**
 * @title SocketPlug
 * @notice It enables message bridging in Super token and Super Token Vault.
 * @dev This contract implements Socket's IPlug to enable message bridging and IMessageBridge
 * to support any type of message bridge.
 */
contract SocketPlug is IPlug, AccessControl, IMessageBridge {
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");

    // socket address
    ISocket public immutable socket__;
    // super token or vault address
    ISuperTokenOrVault public tokenOrVault__;

    // chain slug of current chain
    uint32 public immutable chainSlug;

    // map of sibling chain slugs with the plug addresses
    mapping(uint32 => address) public siblingPlugs;

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when a plug is disconnected
    event SocketPlugDisconnected(uint32 siblingChainSlug);
    // emitted when a super token or vault address is set
    event SuperTokenOrVaultSet();

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error NotSuperTokenOrVault();
    error NotSocket();
    error TokenOrVaultAlreadySet();

    /**
     * @notice constructor for creating a new SocketPlug.
     * @param socket_ The address of the Socket contract used to transmit messages.
     * @param owner_ The address of the owner who has the initial admin role.
     * @param chainSlug_ The unique identifier of the chain this plug is deployed on.
     */
    constructor(
        address socket_,
        address owner_,
        uint32 chainSlug_
    ) AccessControl(owner_) {
        socket__ = ISocket(socket_);
        chainSlug = chainSlug_;
    }

    /**
     * @notice calls socket's outbound function which transmits msg to `siblingChainSlug_`.
     * @dev Only super token or vault can call this function
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param msgGasLimit_ min gas limit needed to execute the message on sibling
     * @param payload_ payload which should be executed at the sibling chain.
     * @return messageId_ identifier used to get message details from Socket.
     */
    function outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory
    ) external payable returns (bytes32 messageId_) {
        if (msg.sender != address(tokenOrVault__))
            revert NotSuperTokenOrVault();

        return
            socket__.outbound{value: msg.value}(
                siblingChainSlug_,
                msgGasLimit_,
                bytes32(0),
                bytes32(0),
                payload_
            );
    }

    /**
     * @notice this function receives the message from sibling chain.
     * @dev Only socket can call this function.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param payload_ payload which should be executed at the super token or vault.
     */
    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override {
        if (msg.sender != address(socket__)) revert NotSocket();
        tokenOrVault__.inbound(siblingChainSlug_, payload_);
    }

    /**
     * @notice this function calculates the fees needed to send the message to Socket.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param msgGasLimit_ min gas limit needed at destination chain to execute the message.
     */
    function getMinFees(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        uint256 payloadSize_
    ) external view returns (uint256 totalFees) {
        return
            socket__.getMinFees(
                msgGasLimit_,
                payloadSize_,
                bytes32(0),
                bytes32(0),
                siblingChainSlug_,
                address(this)
            );
    }

    /**
     * @notice this function is used to set the Super token or Vault address
     * @dev only owner can set the token address.
     * @dev this can be called only once.
     * @param tokenOrVault_ The super token or vault address connected to this plug.
     */
    function setSuperTokenOrVault(address tokenOrVault_) external onlyOwner {
        if (address(tokenOrVault__) != address(0))
            revert TokenOrVaultAlreadySet();
        tokenOrVault__ = ISuperTokenOrVault(tokenOrVault_);
        emit SuperTokenOrVaultSet();
    }

    /**
     * @notice this function is used to connect Socket for a `siblingChainSlug_`.
     * @dev only owner can connect Socket with preferred switchboard address.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param siblingPlug_ address of plug present at siblingChainSlug_ to call at inbound
     * @param inboundSwitchboard_ the address of switchboard to use for verifying messages at inbound
     * @param outboundSwitchboard_ the address of switchboard to use for sending messages
     */
    function connect(
        uint32 siblingChainSlug_,
        address siblingPlug_,
        address inboundSwitchboard_,
        address outboundSwitchboard_
    ) external onlyOwner {
        siblingPlugs[siblingChainSlug_] = siblingPlug_;

        socket__.connect(
            siblingChainSlug_,
            siblingPlug_,
            inboundSwitchboard_,
            outboundSwitchboard_
        );
    }

    /**
     * @notice this function is used to disconnect Socket for a `siblingChainSlug_`.
     * @dev only owner can disconnect Socket
     * @dev it sets sibling plug as address(0) which makes it revert at `outbound()` hence
     * @dev stopping it from sending any message.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     */
    function disconnect(uint32 siblingChainSlug_) external onlyOwner {
        delete siblingPlugs[siblingChainSlug_];

        (
            ,
            address inboundSwitchboard,
            address outboundSwitchboard,
            ,

        ) = socket__.getPlugConfig(address(this), siblingChainSlug_);

        socket__.connect(
            siblingChainSlug_,
            address(0),
            inboundSwitchboard,
            outboundSwitchboard
        );

        emit SocketPlugDisconnected(siblingChainSlug_);
    }

    /**
     * @notice this function is used to calculate message id before sending outbound().
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @return message id
     */
    function getMessageId(
        uint32 siblingChainSlug_
    ) public view returns (bytes32) {
        return
            bytes32(
                (uint256(chainSlug) << 224) |
                    (uint256(uint160(siblingPlugs[siblingChainSlug_])) << 64) |
                    (ISocket(socket__).globalMessageCount())
            );
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
    ) external onlyRole(RESCUE_ROLE) {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
