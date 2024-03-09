pragma solidity ^0.8.3;
import "../common/Structs.sol";

interface IHook {
    // / @dev This function calls the srcHookCall function of the connector contract,
    // / passing in the receiver, amount, connector, and msg.sender, and returns
    // / the updated receiver, amount, and extradata.
    // / @param receiver_ The receiver of the funds.
    // / @param amount_ The amount of funds.
    // / @param siblingChainSlug_ The address of the connector contract.
    // / @param connector_ The address of the connector contract.
    // / @param msgSender_ The address of the message sender.
    // / @param extradata_ Additional data to be passed to the connector contract.
    // / @return receiver The updated receiver of the funds.
    // / @return amount The updated amount of funds.
    // / @return extradata The updated extradata.
    function srcPreHookCall(
        SrcPreHookCallParams calldata srcPreHookCallParams_
    )
        external
        returns (
            TransferInfo memory transferInfo,
            bytes memory postSrcHookData
        );

    function srcPostHookCall(
        SrcPostHookCallParams calldata srcPostHookCallParams_
    ) external returns (TransferInfo memory transferInfo);

    // /**
    //  * @dev This function calls the dstPreHookCall function of the connector contract,
    //  * passing in the receiver, amount, sibling chain slug, connector, extradata, and sibling chain cache,
    //  * and returns the updated receiver, current minted amount, pending mint amount, updated extradata, and additional cache.
    //  * @param receiver_ The receiver of the funds.
    //  * @param amount_ The amount of funds.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param connector_ The address of the connector contract.
    //  * @param extradata_ Additional data to be passed to the connector contract.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return receiver The updated receiver of the funds.
    //  * @return consumedAmount The current minted amount of funds.
    //  * @return postHookData The postHookData.
    //  */
    function dstPreHookCall(
        DstPreHookCallParams calldata dstPreHookCallParams_
    )
        external
        returns (bytes memory postHookData, TransferInfo memory transferInfo);

    // sd
    // // / @dev This function calls the dstPostHookCall function of the connector contract,
    // // / passing in the receiver, amount, connector, and extradata, and updates
    // // / the token supply.
    // // / @param receiver_ The receiver of the funds.
    // // / @param amount_ The amount of funds.
    // // / @param connector_ The address of the connector contract.
    // // / @param extradata_ Additional data to be passed to the connector contract.
    function dstPostHookCall(
        DstPostHookCallParams calldata dstPostHookCallParams_
    ) external returns (CacheData memory cacheData);

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return receiver The updated receiver of the funds.
    //  * @return consumedAmount The amount consumed from the limit.
    //  * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
    //  */
    function preRetryHook(
        PreRetryHookCallParams calldata preRetryHookCallParams_
    )
        external
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        );

    // /**
    //  * @notice Handles post-retry hook logic after execution.
    //  * @dev This function can be used to update caches after retrying a hook.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @param postRetryHookData_ The post-hook data to be processed after the retry hook execution.
    //  * @return newIdentifierCache The updated identifier cache.
    //  * @return newConnectorCache The updated sibling chain cache.
    //  */
    function postRetryHook(
        PostRetryHookCallParams calldata postRetryHookCallParams_
    ) external returns (CacheData memory cacheData);
}
