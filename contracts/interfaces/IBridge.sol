pragma solidity ^0.8.3;

interface IBridge {
    function receiveInbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable;
}
