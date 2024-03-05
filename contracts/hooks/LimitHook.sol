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

    /**
     * @dev This function calls the srcHookCall function of the connector contract,
     * passing in the receiver, amount, siblingChainSlug, extradata, and msg.sender, and returns
     * the updated receiver, amount, and extradata.
     * @param receiver_ The receiver of the funds.
     * @param amount_ The amount of funds.
     * @param siblingChainSlug_ The sibling chain identifier.
     * @param extradata_ Additional data to be passed to the connector contract.
     * @return updatedReceiver The updated receiver of the funds.
     * @return updatedAmount The updated amount of funds.
     * @return updatedExtradata The updated extradata.
     */
    function srcHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address connector_,
        address,
        bytes memory extradata_
    )
        external
        isVaultOrToken
        returns (
            address updatedReceiver,
            uint256 updatedAmount,
            bytes memory updatedExtradata
        )
    {
        _limitSrcHook(connector_, receiver_, amount_);
        return (receiver_, amount_, extradata_);
    }

    /**
     * @notice Handles pre-hook logic before the execution of a destination hook.
     * @dev This function checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
     * @param receiver_ The receiver of the funds.
     * @param amount_ The amount of funds.
     * @param siblingChainSlug_ The unique identif_ier of the sibling chain.
     * @param connector_ The address of the connector contract.
     * @param extradata_ Additional data to be passed to the connector contract.
     * @param connectorCache_ Sibling chain cache containing pending amount information.
     * @return updatedReceiver The updated receiver of the funds.
     * @return consumedAmount The amount consumed from the limit.
     * @return postHookData The post-hook data to be processed after the hook execution.
     */

    function dstPreHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address connector_,
        bytes memory extradata_,
        bytes memory connectorCache_
    ) external isVaultOrToken returns (address, uint256, bytes memory) {
        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            connector_,
            receiver_,
            amount_
        );

        return (
            receiver_,
            consumedAmount,
            abi.encode(consumedAmount, pendingAmount)
        );
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     * @param receiver_ The receiver of the funds.
     * @param amount_ The amount of funds.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param bridge_ The address of the bridge contract.
     * @param extradata_ Additional data passed to the connector contract.
     * @param postHookData_ The post-hook data containing consumed and pending amounts.
     * @param connectorCache_ Sibling chain cache containing pending amount information.
     * @return newIdentifierCache The updated identifier cache.
     * @return newConnectorCache The updated sibling chain cache.
     */
    function dstPostHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address bridge_,
        bytes memory extradata_,
        bytes memory postHookData_,
        bytes memory connectorCache_
    )
        external
        isVaultOrToken
        returns (
            bytes memory newIdentifierCache,
            bytes memory newConnectorCache
        )
    {
        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            postHookData_,
            (uint256, uint256)
        );
        uint256 connectorPendingAmount = abi.decode(connectorCache_, (uint256));

        if (pendingAmount > 0) {
            newIdentifierCache = abi.encode(receiver_, pendingAmount);
            newConnectorCache = abi.encode(
                connectorPendingAmount + pendingAmount
            );
        } else {
            newIdentifierCache = new bytes(0);
            newConnectorCache = connectorCache_;
        }
    }

    /**
     * @notice Handles pre-retry hook logic before execution.
     * @dev This function can be used to mint funds which were in a pending state due to limits.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifierCache_ Identifier cache containing pending mint information.
     * @param connectorCache_ Sibling chain cache containing pending amount information.
     * @return updatedReceiver The updated receiver of the funds.
     * @return consumedAmount The amount consumed from the limit.
     * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
     */
    function preRetryHook(
        uint32 siblingChainSlug_,
        address connector_,
        bytes memory identifierCache_,
        bytes memory connectorCache_
    )
        external
        nonReentrant
        isVaultOrToken
        returns (
            address updatedReceiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        )
    {
        uint256 pendingMint;
        (updatedReceiver, pendingMint) = abi.decode(
            identifierCache_,
            (address, uint256)
        );
        uint256 pendingAmount;
        (consumedAmount, pendingAmount) = _limitDstHook(
            connector_,
            updatedReceiver,
            pendingMint
        );

        postRetryHookData = abi.encode(
            updatedReceiver,
            consumedAmount,
            pendingAmount
        );
    }

    /**
     * @notice Handles post-retry hook logic after execution.
     * @dev This function can be used to update caches after retrying a hook.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifierCache_ Identifier cache containing pending mint information.
     * @param connectorCache_ Sibling chain cache containing pending amount information.
     * @param postRetryHookData_ The post-hook data to be processed after the retry hook execution.
     * @return newIdentifierCache The updated identifier cache.
     * @return newConnectorCache The updated sibling chain cache.
     */
    function postRetryHook(
        uint32 siblingChainSlug_,
        address connector_,
        bytes memory identifierCache_,
        bytes memory connectorCache_,
        bytes memory postRetryHookData_
    )
        external
        isVaultOrToken
        nonReentrant
        returns (
            bytes memory newIdentifierCache,
            bytes memory newConnectorCache
        )
    {
        (
            address updatedReceiver,
            uint256 consumedAmount,
            uint256 pendingAmount
        ) = abi.decode(postRetryHookData_, (address, uint256, uint256));

        uint256 connectorPendingAmount = abi.decode(connectorCache_, (uint256));

        newConnectorCache = abi.encode(connectorPendingAmount - consumedAmount);
        if (pendingAmount > 0) {
            newIdentifierCache = abi.encode(updatedReceiver, pendingAmount);
        } else {
            newIdentifierCache = new bytes(0);
        }
    }
}
