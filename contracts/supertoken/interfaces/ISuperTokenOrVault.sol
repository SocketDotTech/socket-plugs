pragma solidity 0.8.13;

/**
 * @title ISuperTokenOrVault
 * @notice It should be implemented Super token and Vault for plugs to communicate.
 */
interface ISuperTokenOrVault {
    /**
     * @dev this should be only executable by socket.
     * @notice executes the message received from source chain.
     * @notice It is expected to have original sender checks in the destination plugs using payload.
     * @param siblingChainSlug_ chain slug of source.
     * @param payload_ the data which is needed to decode receiver, amount, msgId and payload.
     */
    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable;
}
