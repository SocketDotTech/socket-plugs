pragma solidity ^0.8.3;

interface IHook {
    /// @dev This function calls the srcHookCall function of the connector contract,
    /// passing in the receiver, amount, connector, and msg.sender, and returns
    /// the updated receiver, amount, and extradata.
    /// @param receiver_ The receiver of the funds.
    /// @param amount_ The amount of funds.
    /// @param siblingChainSlug_ The address of the connector contract.
    /// @param connector_ The address of the connector contract.
    /// @param msgSender_ The address of the message sender.
    /// @param extradata_ Additional data to be passed to the connector contract.
    /// @return receiver The updated receiver of the funds.
    /// @return amount The updated amount of funds.
    /// @return extradata The updated extradata.
    function srcHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address connector_,
        address msgSender_,
        bytes memory extradata_
    )
        external
        returns (address receiver, uint256 amount, bytes memory extradata);

    /**
     * @dev This function calls the dstPreHookCall function of the connector contract,
     * passing in the receiver, amount, sibling chain slug, connector, extradata, and sibling chain cache,
     * and returns the updated receiver, current minted amount, pending mint amount, updated extradata, and additional cache.
     * @param receiver_ The receiver of the funds.
     * @param amount_ The amount of funds.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param connector_ The address of the connector contract.
     * @param extradata_ Additional data to be passed to the connector contract.
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
     * @return receiver The updated receiver of the funds.
     * @return consumedAmount The current minted amount of funds.
     * @return postHookData The postHookData.
     */
    function dstPreHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address connector_,
        bytes memory extradata_,
        bytes memory siblingChainCache_
    )
        external
        returns (
            address receiver,
            uint256 consumedAmount,
            bytes memory postHookData
        );

    /// @dev This function calls the dstPostHookCall function of the connector contract,
    /// passing in the receiver, amount, connector, and extradata, and updates
    /// the token supply.
    /// @param receiver_ The receiver of the funds.
    /// @param amount_ The amount of funds.
    /// @param connector_ The address of the connector contract.
    /// @param extradata_ Additional data to be passed to the connector contract.
    function dstPostHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address connector_,
        bytes memory extradata_,
        bytes memory postHookData_,
        bytes memory siblingChainCache_
    )
        external
        returns (
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache_
        );

    /**
     * @notice Handles pre-retry hook logic before execution.
     * @dev This function can be used to mint funds which were in a pending state due to limits.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifierCache_ Identifier cache containing pending mint information.
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
     * @return receiver The updated receiver of the funds.
     * @return consumedAmount The amount consumed from the limit.
     * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
     */
    function preRetryHook(
        uint32 siblingChainSlug_,
        bytes memory identifierCache_,
        bytes memory siblingChainCache_
    )
        external
        returns (
            address receiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        );

    /**
     * @notice Handles post-retry hook logic after execution.
     * @dev This function can be used to update caches after retrying a hook.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifierCache_ Identifier cache containing pending mint information.
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
     * @param postRetryHookData_ The post-hook data to be processed after the retry hook execution.
     * @return newIdentifierCache The updated identifier cache.
     * @return newSiblingChainCache The updated sibling chain cache.
     */
    function postRetryHook(
        uint32 siblingChainSlug_,
        bytes memory identifierCache_,
        bytes memory siblingChainCache_,
        bytes memory postRetryHookData_
    )
        external
        returns (
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache
        );
}
