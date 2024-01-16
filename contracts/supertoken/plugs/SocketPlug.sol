pragma solidity 0.8.13;

import {ISocket} from "../../interfaces/ISocket.sol";
import {IPlug} from "../../interfaces/IPlug.sol";
import {AccessControl} from "../../common/AccessControl.sol";
import {RescueFundsLib} from "../../libraries/RescueFundsLib.sol";
import {IMessageBridge} from "./../IMessageBridge.sol";
import {ISuperToken} from "./../ISuperToken.sol";

contract SocketPlug is IPlug, AccessControl, IMessageBridge {
    ISocket public immutable socket__;
    ISuperToken public token__;

    uint32 public immutable chainSlug;
    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");
    mapping(uint32 => address) public siblingPlugs;

    event SocketPlugDisconnected(uint32 siblingChainSlug);
    event SuperTokenSet();

    error NotSuperTokenOrVault();
    error NotSocket();
    error TokenAlreadySet();

    constructor(
        address socket_,
        address owner_,
        uint32 chainSlug_
    ) AccessControl(owner_) {
        socket__ = ISocket(socket_);
        chainSlug = chainSlug_;
    }

    // extra bytes memory can be used by other protocol plugs for additional options
    function outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory
    ) external payable returns (bytes32 messageId_) {
        if (msg.sender != address(token__)) revert NotSuperTokenOrVault();

        return
            socket__.outbound{value: msg.value}(
                siblingChainSlug_,
                msgGasLimit_,
                bytes32(0),
                bytes32(0),
                payload_
            );
    }

    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override {
        if (msg.sender != address(socket__)) revert NotSocket();
        token__.inbound(siblingChainSlug_, payload_);
    }

    function getMinFees(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return
            socket__.getMinFees(
                msgGasLimit_,
                96,
                bytes32(0),
                bytes32(0),
                siblingChainSlug_,
                address(this)
            );
    }

    function setSuperToken(address token) external onlyOwner {
        if (address(token__) != address(0)) revert TokenAlreadySet();
        token__ = ISuperToken(token);
        emit SuperTokenSet();
    }

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

    function disconnect(uint32 siblingChainSlug_) external onlyOwner {
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
