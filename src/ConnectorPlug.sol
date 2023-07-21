pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {ISocket} from "../../interfaces/ISocket.sol";
import {IPlug} from "../../interfaces/IPlug.sol";

interface IHub {
    function receiveInbound(bytes memory payload_) external;
}

interface IConnector {
    function outbound(
        uint256 gasLimit_,
        bytes memory payload_
    ) external payable;

    function siblingChainSlug() external returns (uint32);
}

contract ConnectorPlug is IConnector, IPlug, Ownable2Step {
    IHub public hub__;
    ISocket public socket__;
    uint32 public immutable siblingChainSlug;

    error NotHub();
    error NotSocket();

    constructor(address hub_, address socket_, uint32 siblingChainSlug_) {
        hub__ = IHub(hub_);
        socket__ = ISocket(socket_);
        siblingChainSlug = siblingChainSlug_;
    }

    function outbound(
        uint256 gasLimit_,
        bytes memory payload_
    ) external payable override {
        if (msg.sender != address(hub__)) revert NotHub();

        socket__.outbound{value: msg.value}(
            siblingChainSlug,
            gasLimit_,
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

    // @todo: disconnect
}
