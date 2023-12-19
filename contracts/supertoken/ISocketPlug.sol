pragma solidity 0.8.13;

interface ISocketPlug {
    function outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_
    ) external payable returns (bytes32 messageId_);

    function getMinFees(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees);

    function getMessageId() external view returns (bytes32);
}
