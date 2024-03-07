pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./plugins/LimitPlugin.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract enabling bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract LimitHook is LimitPlugin {
    /**
     * @notice Constructor for creating a new SuperToken.
     * @param owner_ Owner of this contract.
     */
    constructor(
        address owner_,
        address vaultOrToken_
    ) HookBase(owner_, vaultOrToken_) {}

    // /**
    //  * @dev This function calls the srcHookCall function of the connector contract,
    //  * passing in the receiver, amount, siblingChainSlug, extradata, and msg.sender, and returns
    //  * the updated receiver, amount, and extradata.
    //  * @param receiver_ The receiver of the funds.
    //  * @param amount_ The amount of funds.
    //  * @param siblingChainSlug_ The sibling chain identifier.
    //  * @param extradata_ Additional data to be passed to the connector contract.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return updatedAmount The updated amount of funds.
    //  * @return updatedExtradata The updated extradata.
    //  */
    function srcPreHookCall(
        SrcPreHookCallParams memory params_
    ) external isVaultOrToken returns (TransferInfo memory) {
        _limitSrcHook(params_.connector, params_.transferInfo.amount);
        return params_.transferInfo;
    }

    function srcPostHookCall(
        bytes memory payload_
    ) external returns (bytes memory) {
        return payload_;
    }

    // /**
    //  * @notice Handles pre-hook logic before the execution of a destination hook.
    //  * @dev This function checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
    //  * @param receiver_ The receiver of the funds.
    //  * @param amount_ The amount of funds.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param connector_ The address of the connector contract.
    //  * @param extradata_ Additional data to be passed to the connector contract.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedAmount The amount consumed from the limit.
    //  * @return postHookData The post-hook data to be processed after the hook execution.
    //  */
    function dstPreHookCall(
        DstPreHookCallParams memory params_
    )
        external
        isVaultOrToken
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = params_.transferInfo;
        transferInfo.amount = consumedAmount;
    }

    // /**
    //  * @notice Handles post-hook logic after the execution of a destination hook.
    //  * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
    //  * @param receiver_ The receiver of the funds.
    //  * @param amount_ The amount of funds.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param bridge_ The address of the bridge contract.
    //  * @param extradata_ Additional data passed to the connector contract.
    //  * @param postHookData_ The post-hook data containing consumed and pending amounts.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return newIdentifierCache The updated identifier cache.
    //  * @return newConnectorCache The updated sibling chain cache.
    //  */
    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) external view isVaultOrToken returns (CacheData memory cacheData) {
        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            params_.postHookData,
            (uint256, uint256)
        );
        uint256 connectorPendingAmount = abi.decode(
            params_.connectorCache,
            (uint256)
        );
        if (pendingAmount > 0) {
            cacheData = CacheData(
                abi.encode(params_.transferInfo.receiver, pendingAmount),
                abi.encode(connectorPendingAmount + pendingAmount)
            );
        } else {
            cacheData = CacheData(bytes(""), params_.connectorCache);
        }
    }

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedAmount The amount consumed from the limit.
    //  * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
    //  */
    function preRetryHook(
        PreRetryHookCallParams memory params_
    )
        external
        nonReentrant
        isVaultOrToken
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (address updatedReceiver, uint256 pendingMint) = abi.decode(
            params_.cacheData.identifierCache,
            (address, uint256)
        );
        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            pendingMint
        );

        postRetryHookData = abi.encode(
            updatedReceiver,
            consumedAmount,
            pendingAmount
        );
        transferInfo = TransferInfo(updatedReceiver, consumedAmount, bytes(""));
    }

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
        PostRetryHookCallParams calldata params_
    )
        external
        isVaultOrToken
        nonReentrant
        returns (CacheData memory cacheData)
    {
        (
            address updatedReceiver,
            uint256 consumedAmount,
            uint256 pendingAmount
        ) = abi.decode(params_.postRetryHookData, (address, uint256, uint256));

        uint256 connectorPendingAmount = abi.decode(
            params_.cacheData.connectorCache,
            (uint256)
        );
        cacheData.connectorCache = abi.encode(
            connectorPendingAmount - consumedAmount
        );
        if (pendingAmount > 0) {
            cacheData.identifierCache = abi.encode(
                updatedReceiver,
                pendingAmount
            );
        } else {
            cacheData.identifierCache = new bytes(0);
        }
    }
}
