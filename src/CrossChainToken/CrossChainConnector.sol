pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {ISocket} from "../interfaces/ISocket.sol";
import {IPlug} from "../interfaces/IPlug.sol";
import {RescueFundsLib} from "../RescueFundsLib.sol";

interface IHub {
    function receiveInbound(bytes memory payload_) external;
}

interface IConnector {
    function outbound(
        uint256 msgGasLimit_,
        bytes memory payload_
    ) external payable;

    function siblingChainSlug() external view returns (uint32);

    function getMinFees(
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees);
}

contract CrossChainConnector is IConnector, IPlug, Ownable2Step {
    IHub public immutable hub__;
    ISocket public immutable socket__;
    uint32 public immutable siblingChainSlug;

    error NotHub();
    error NotSocket();

    event ConnectorPlugDisconnected();

    constructor(address hub_, address socket_, uint32 siblingChainSlug_) {
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
                96,
                bytes32(0),
                bytes32(0),
                siblingChainSlug,
                address(this)
            );
    }

    function connect(
        address siblingPlug_,
        address inboundSwitchboard_,
        address outboundSwitchboard_
    ) external onlyOwner {
        socket__.connect(
            siblingChainSlug,
            siblingPlug_,
            inboundSwitchboard_,
            outboundSwitchboard_
        );
    }

    function disconnect() external onlyOwner {
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
