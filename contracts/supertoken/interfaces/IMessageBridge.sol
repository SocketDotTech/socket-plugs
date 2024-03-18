// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

/**
 * @title IMessageBridge
 * @notice It should be implemented by message bridge integrated to Super token and Vault.
 */
interface IMessageBridge {
    /**
     * @notice calls socket's outbound function which transmits msg to `siblingChainSlug_`.
     * @dev Only super token or vault can call this contract
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param msgGasLimit_ min gas limit needed to execute the message on sibling
     * @param payload_ payload which should be executed at the sibling chain.
     * @param options_ extra bytes memory can be used by other protocol plugs for additional options
     */
    function outbound(
        uint32 siblingChainSlug_,
        uint256 msgGasLimit_,
        bytes memory payload_,
        bytes memory options_
    ) external payable returns (bytes32 messageId_);

    /**
     * @notice this function is used to calculate message id before sending outbound().
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @return message id
     */
    function getMessageId(
        uint32 siblingChainSlug_
    ) external view returns (bytes32);
}
