pragma solidity 0.8.13;

import {ISocket} from "../interfaces/ISocket.sol";
import {IPlug} from "../interfaces/IPlug.sol";
import {Ownable} from "../common/Ownable.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";

abstract contract SuperPlug is IPlug, Ownable {
    ISocket public socket__;

    event SuperPlugDisconnected(uint32 siblingChainSlug);
    event SocketUpdated();

    error NotSocket();

    constructor(address socket_, address owner_) Ownable(owner_) {
        socket__ = ISocket(socket_);
    }

    function _outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_
    ) internal returns (bytes32 messageId_) {
        return
            socket__.outbound{value: msg.value}(
                siblingChainSlug_,
                msgGasLimit_,
                bytes32(0),
                bytes32(0),
                payload_
            );
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

    function updateSocket(address socket_) external onlyOwner {
        socket__ = ISocket(socket_);
        emit SocketUpdated();
    }

    function connect(
        uint32 siblingChainSlug_,
        address siblingPlug_,
        address inboundSwitchboard_,
        address outboundSwitchboard_
    ) external onlyOwner {
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

        emit SuperPlugDisconnected(siblingChainSlug_);
    }

    function getMessageId(
        uint32 siblingChainSlug_
    ) public view returns (bytes32) {
        return
            bytes32(
                (uint256(siblingChainSlug_) << 224) |
                    (uint256(uint160(address(this))) << 64) |
                    (ISocket(socket__).globalMessageCount() + 1)
            );
    }
}
