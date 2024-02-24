pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./LimitHookBase.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract enabling bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract LimitHook is LimitHookBase {
    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // Emitted when pending tokens are minted to the receiver
    event PendingTokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 pendingAmount,
        bytes32 identifier
    );
    // Emitted when the transfer reaches the limit, and the token mint is added to the pending queue
    event TokensPending(
        uint32 siblingChainSlug,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 identifier
    );

    /**
     * @notice Constructor for creating a new SuperToken.
     * @param owner_ Owner of this contract.
     */
    constructor(address owner_) AccessControl(owner_) {}

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
        address,
        address,
        bytes memory extradata_
    )
        external
        returns (
            address updatedReceiver,
            uint256 updatedAmount,
            bytes memory updatedExtradata
        )
    {
        if (_sendingLimitParams[siblingChainSlug].maxLimit == 0)
            revert SiblingNotSupported();

        _consumeFullLimit(amount, _sendingLimitParams[siblingChainSlug]); // Reverts on limit hit
        return (receiver, amount, extradata);
    }

    /**
     * @notice Handles pre-hook logic before the execution of a destination hook.
     * @dev This function checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
     * @param receiver_ The receiver of the funds.
     * @param amount_ The amount of funds.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param connector_ The address of the connector contract.
     * @param extradata_ Additional data to be passed to the connector contract.
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
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
        bytes memory siblingChainCache_
    )
        external
        returns (
            address updatedReceiver,
            uint256 consumedAmount,
            bytes memory postHookData
        )
    {
        if (_receivingLimitParams[siblingChainSlug].maxLimit == 0)
            revert SiblingNotSupported();
        uint256 pendingAmount;
        (consumedAmount, pendingAmount) = _consumePartLimit(
            amount,
            _receivingLimitParams[siblingChainSlug]
        );

        return (
            receiver,
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
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
     * @return newIdentifierCache The updated identifier cache.
     * @return newSiblingChainCache The updated sibling chain cache.
     */
    function dstPostHookCall(
        address receiver_,
        uint256 amount_,
        uint32 siblingChainSlug_,
        address bridge_,
        bytes memory extradata_,
        bytes memory postHookData_,
        bytes memory siblingChainCache_
    )
        external
        returns (
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache
        )
    {
        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            postHookData,
            (uint256, uint256)
        );
        uint256 siblingPendingAmount = abi.decode(siblingChainCache, (uint256));

        if (pendingAmount > 0) {
            newIdentifierCache = abi.encode(receiver, pendingAmount);
            newSiblingChainCache = abi.encode(
                siblingPendingAmount + pendingAmount
            );
        } else {
            newIdentifierCache = new bytes(0);
            newSiblingChainCache = siblingChainCache;
        }
    }

    /**
     * @notice Handles pre-retry hook logic before execution.
     * @dev This function can be used to mint funds which were in a pending state due to limits.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifierCache_ Identifier cache containing pending mint information.
     * @param siblingChainCache_ Sibling chain cache containing pending amount information.
     * @return updatedReceiver The updated receiver of the funds.
     * @return consumedAmount The amount consumed from the limit.
     * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
     */
    function preRetryHook(
        uint32 siblingChainSlug_,
        bytes memory identifierCache_,
        bytes memory siblingChainCache_
    )
        external
        nonReentrant
        returns (
            address updatedReceiver,
            uint256 consumedAmount,
            bytes memory postRetryHookData
        )
    {
        if (_receivingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        uint256 pendingMint;
        (updatedReceiver, pendingMint) = abi.decode(
            identifierCache_,
            (address, uint256)
        );
        uint256 pendingAmount;
        (consumedAmount, pendingAmount) = _consumePartLimit(
            pendingMint,
            _receivingLimitParams[siblingChainSlug_]
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
        nonReentrant
        returns (
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache
        )
    {
        (
            address updatedReceiver,
            uint256 consumedAmount,
            uint256 pendingAmount
        ) = abi.decode(postRetryHookData_, (address, uint256, uint256));

        uint256 siblingPendingAmount = abi.decode(
            siblingChainCache_,
            (uint256)
        );

        newSiblingChainCache = abi.encode(
            siblingPendingAmount - consumedAmount
        );
        if (pendingAmount > 0) {
            newIdentifierCache = abi.encode(updatedReceiver, pendingAmount);
        } else {
            newIdentifierCache = new bytes(0);
        }
    }
}
