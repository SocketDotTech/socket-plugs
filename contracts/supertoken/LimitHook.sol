pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "./HookBase.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract enabling bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract LimitHook is HookBase {
    struct UpdateLimitParams {
        bool isMint;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // siblingChainSlug => receivingLimitParams
    mapping(uint32 => LimitParams) _receivingLimitParams;

    // siblingChainSlug => sendingLimitParams
    mapping(uint32 => LimitParams) _sendingLimitParams;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error SiblingNotSupported();
    error MessageIdMismatched();
    error NotMessageBridge();
    error InvalidSiblingChainSlug();

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // Emitted when limit parameters are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    // Emitted when the message bridge is updated
    event MessageBridgeUpdated(address newBridge);

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

    /// @dev This function calls the srcHookCall function of the connector contract,
    /// passing in the receiver, amount, connector, and msg.sender, and returns
    /// the updated receiver, amount, and extradata.
    /// @param receiver The receiver of the funds.
    /// @param amount The amount of funds.
    /// @param siblingChainSlug The sibling chain identifier.
    /// @param extradata Additional data to be passed to the connector contract.
    /// @return updatedReceiver receiver The updated receiver of the funds.
    /// @return updatedAmount The updated amount of funds.
    /// @return updatedExtradata The updated extradata.
    function srcHookCall(
        address receiver,
        uint256 amount,
        uint32 siblingChainSlug,
        address,
        address,
        bytes memory extradata
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
     * @notice This function is called before the execution of a destination hook.
     * @dev It checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
     * @param receiver The receiver of the funds.
     * @param amount The amount of funds.
     * @param siblingChainSlug The unique identifier of the sibling chain.
     * @param connector The address of the connector contract.
     * @param extradata Additional data to be passed to the connector contract.
     * @param siblingChainCache Sibling chain cache containing pending amount information.
     * @return updatedReceiver The updated receiver of the funds.
     * @return consumedAmount The amount consumed from the limit.
     * @return postHookData The post-hook data to be processed after the hook execution.
     */

    function dstPreHookCall(
        address receiver,
        uint256 amount,
        uint32 siblingChainSlug,
        address connector,
        bytes memory extradata,
        bytes memory siblingChainCache
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
     * @notice This function is called after the execution of a destination hook.
     * @dev It processes post-hook data to update the identifier cache and sibling chain cache.
     * @param receiver The receiver of the funds.
     * @param amount The amount of funds.
     * @param siblingChainSlug The unique identifier of the sibling chain.
     * @param connector The address of the connector contract.
     * @param extradata Additional data passed to the connector contract.
     * @param postHookData The post-hook data containing consumed and pending amounts.
     * @param siblingChainCache Sibling chain cache containing pending amount information.
     * @return newIdentifierCache The updated identifier cache.
     * @return newSiblingChainCache The updated sibling chain cache.
     */
    function dstPostHookCall(
        address receiver,
        uint256 amount,
        uint32 siblingChainSlug,
        address connector,
        bytes memory extradata,
        bytes memory postHookData,
        bytes memory siblingChainCache
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
     * @notice This function is used to set bridge limits.
     * @dev It can only be updated by the owner.
     * @param updates An array of structs containing update parameters.
     */
    function updateLimitParams(
        UpdateLimitParams[] calldata updates
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i = 0; i < updates.length; i++) {
            if (updates[i].isMint) {
                _consumePartLimit(
                    0,
                    _receivingLimitParams[updates[i].siblingChainSlug]
                ); // To keep the current limit in sync
                _receivingLimitParams[updates[i].siblingChainSlug]
                    .maxLimit = updates[i].maxLimit;
                _receivingLimitParams[updates[i].siblingChainSlug]
                    .ratePerSecond = updates[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _sendingLimitParams[updates[i].siblingChainSlug]
                ); // To keep the current limit in sync
                _sendingLimitParams[updates[i].siblingChainSlug]
                    .maxLimit = updates[i].maxLimit;
                _sendingLimitParams[updates[i].siblingChainSlug]
                    .ratePerSecond = updates[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates);
    }

    /**
     * @notice This function can be used to mint funds which were in a pending state due to limits.
     * @param siblingChainSlug The unique identifier of the sibling chain.
     * @param identifierCache Identifier cache containing pending mint information.
     * @param siblingChainCache Sibling chain cache containing pending amount information.
     */
    function retry(
        uint32 siblingChainSlug,
        bytes memory identifierCache,
        bytes memory siblingChainCache
    )
        external
        nonReentrant
        returns (
            address updatedReceiver,
            uint256 consumedAmount,
            bytes memory newIdentifierCache,
            bytes memory newSiblingChainCache
        )
    {
        if (_receivingLimitParams[siblingChainSlug].maxLimit == 0)
            revert SiblingNotSupported();

        uint256 pendingMint;
        (updatedReceiver, pendingMint) = abi.decode(
            identifierCache,
            (address, uint256)
        );
        uint256 siblingPendingAmount = abi.decode(siblingChainCache, (uint256));
        uint256 pendingAmount;
        (consumedAmount, pendingAmount) = _consumePartLimit(
            pendingMint,
            _receivingLimitParams[siblingChainSlug]
        );
        newSiblingChainCache = abi.encode(
            siblingPendingAmount - consumedAmount
        );
        if (pendingAmount > 0) {
            newIdentifierCache = abi.encode(updatedReceiver, pendingAmount);
        } else {
            newIdentifierCache = new bytes(0);
        }

        return (
            updatedReceiver,
            consumedAmount,
            newIdentifierCache,
            newSiblingChainCache
        );
    }

    function getCurrentReceivingLimit(
        uint32 siblingChainSlug
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[siblingChainSlug]);
    }

    function getCurrentSendingLimit(
        uint32 siblingChainSlug
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[siblingChainSlug]);
    }

    function getReceivingLimitParams(
        uint32 siblingChainSlug
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[siblingChainSlug];
    }

    function getSendingLimitParams(
        uint32 siblingChainSlug
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[siblingChainSlug];
    }
}
