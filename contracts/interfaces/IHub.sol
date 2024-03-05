pragma solidity ^0.8.3;

interface IHub {
    function receiveInbound(bytes memory payload_) external;
}
