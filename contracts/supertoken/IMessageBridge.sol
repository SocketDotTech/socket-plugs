pragma solidity 0.8.13;

interface IMessageBridge {
    function outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory options_
    ) external payable returns (bytes32 messageId_);

    function getMessageId(
        uint32 siblingChainSlug
    ) external view returns (bytes32);
}
