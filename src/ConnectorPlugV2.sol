pragma solidity 0.8.13;

import "solmate/auth/Owned.sol";
import {ISocket} from "./interfaces/ISocket.sol";
import {IPlug} from "./interfaces/IPlug.sol";
import "./ConnectorPlug.sol";

// interface IHub {
//     function receiveInbound(bytes memory payload_) external;
// }

// interface IConnector {
//     function outbound(
//         uint256 msgGasLimit_,
//         bytes memory payload_
//     ) external payable;

//     function siblingChainSlug() external view returns (uint32);

//     function getMinFees(
//         uint256 msgGasLimit_
//     ) external view returns (uint256 totalFees);
// }

contract ConnectorPlugV2 is IConnector, IPlug, Owned {
    IHub public immutable hub__;
    ISocket public immutable socket__;
    uint32 public immutable siblingChainSlug;

    error NotHub();
    error NotSocket();

    event ConnectorPlugDisconnected(address siblingPlug);

    constructor(address hub_, address socket_, uint32 siblingChainSlug_, address owner) Owned(owner) {
        hub__ = IHub(hub_);
        socket__ = ISocket(socket_);
        siblingChainSlug = siblingChainSlug_;
    }

    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_
    ) external payable override {
        if (msg.sender != address(hub__)) revert NotHub();

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

    function getMinFees(
        uint256 msgGasLimit_
    ) external view override returns (uint256 totalFees) {
        return
            socket__.getMinFees(
                msgGasLimit_,
                64,
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
        socket__.connect(
            siblingChainSlug,
            siblingPlug_,
            switchboard_,
            switchboard_
        );
    }

    function disconnect(address siblingPlug_) external onlyOwner {
        socket__.connect(
            siblingChainSlug,
            siblingPlug_,
            address(0),
            address(0)
        );

        emit ConnectorPlugDisconnected(siblingPlug_);
    }
}
