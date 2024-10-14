// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;
import "../common/Structs.sol";
import "../common/NFTStructs.sol";

interface INFTHook {
    /**
     * @notice Executes pre-hook call for source underlyingAsset.
     * @dev This function is used to execute a pre-hook call for the source underlyingAsset before initiating a transfer.
     * @param params_ Parameters for the pre-hook call.
     * @return transferInfo Information about the transfer.
     * @return postHookData returned from the pre-hook call.
     */
    function srcPreHookCall(
        SrcPreHookNFTCallParams calldata params_
    )
        external
        returns (
            NFTTransferInfo memory transferInfo,
            bytes memory postHookData
        );

    function srcPostHookCall(
        SrcPostHookNFTCallParams calldata params_
    ) external returns (NFTTransferInfo memory transferInfo);

    /**
     * @notice Executes pre-hook call for destination underlyingAsset.
     * @dev This function is used to execute a pre-hook call for the destination underlyingAsset before initiating a transfer.
     * @param params_ Parameters for the pre-hook call.
     */
    function dstPreHookCall(
        DstPreHookNFTCallParams calldata params_
    )
        external
        returns (
            bytes memory postHookData,
            NFTTransferInfo memory transferInfo
        );

    /**
     * @notice Executes post-hook call for destination underlyingAsset.
     * @dev This function is used to execute a post-hook call for the destination underlyingAsset after completing a transfer.
     * @param params_ Parameters for the post-hook call.
     * @return cacheData Cached data for the post-hook call.
     */
    function dstPostHookCall(
        DstPostHookNFTCallParams calldata params_
    ) external returns (CacheData memory cacheData);

    /**
     * @notice Executes a pre-retry hook for a failed transaction.
     * @dev This function is used to execute a pre-retry hook for a failed transaction.
     * @param params_ Parameters for the pre-retry hook.
     * @return postHookData Data from the post-retry hook.
     * @return transferInfo Information about the transfer.
     */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        external
        returns (
            bytes memory postHookData,
            NFTTransferInfo memory transferInfo
        );

    /**
     * @notice Executes a post-retry hook for a failed transaction.
     * @dev This function is used to execute a post-retry hook for a failed transaction.
     * @param params_ Parameters for the post-retry hook.
     * @return cacheData Cached data for the post-retry hook.
     */
    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) external returns (CacheData memory cacheData);
}
