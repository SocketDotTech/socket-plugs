pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "./plugins/ExecutablePayloadBase.sol";

/**
 * @title SuperTokenVault
 * @notice Vault contract which is used to lock/unlock token and enable bridging to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract SuperTokenVaultWithExecutionPayload is ExecutablePayloadBase {
    using SafeTransferLib for ERC20;

    struct UpdateLimitParams {
        bool isLock;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    ERC20 public immutable token__;
    IMessageBridge public bridge__;

    // siblingChainSlug => receiver => identifier => pendingUnlock
    mapping(uint32 => mapping(address => mapping(bytes32 => uint256)))
        public pendingUnlocks;

    // siblingChainSlug => amount
    mapping(uint32 => uint256) public siblingPendingUnlocks;

    // siblingChainSlug => lockLimitParams
    mapping(uint32 => LimitParams) _lockLimitParams;

    // siblingChainSlug => unlockLimitParams
    mapping(uint32 => LimitParams) _unlockLimitParams;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error SiblingChainSlugUnavailable();
    error NotMessageBridge();
    error InvalidReceiver();
    error InvalidSiblingChainSlug();
    error MessageIdMisMatched();
    error InvalidTokenContract();

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when a message bridge is updated
    event MessageBridgeUpdated(address bridge);
    // emitted when limit params are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    // emitted at source when tokens are deposited to be bridged to a sibling chain
    event TokensDeposited(
        uint32 siblingChainSlug,
        address depositor,
        address receiver,
        uint256 depositAmount,
        bytes32 identifier
    );
    // emitted when pending tokens are transferred to the receiver
    event PendingTokensTransferred(
        uint32 siblingChainSlug,
        address receiver,
        uint256 unlockedAmount,
        uint256 pendingAmount,
        bytes32 identifier
    );
    // emitted when transfer reaches limit and token transfer is added to pending queue
    event TokensPending(
        uint32 siblingChainSlug,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 identifier
    );
    // emitted when pending tokens are unlocked as limits are replenished
    event TokensUnlocked(
        uint32 siblingChainSlug,
        address receiver,
        uint256 unlockedAmount,
        bytes32 identifier
    );

    /**
     * @notice constructor for creating a new SuperTokenVault.
     * @param token_ token contract address which is to be bridged.
     * @param owner_ owner of this contract
     * @param bridge_ message bridge address
     */
    constructor(
        address token_,
        address owner_,
        address bridge_,
        address executionHelper_
    ) AccessControl(owner_) {
        if (token_.code.length == 0) revert InvalidTokenContract();
        token__ = ERC20(token_);
        bridge__ = IMessageBridge(bridge_);
        executionHelper__ = ExecutionHelperPlugin(executionHelper_);
    }

    /**
     * @notice this function is used to update message bridge
     * @dev it can only be updated by owner
     * @dev should be carefully migrated as it can risk user funds
     * @param bridge_ new bridge address
     */
    function updateMessageBridge(address bridge_) external onlyOwner {
        bridge__ = IMessageBridge(bridge_);
        emit MessageBridgeUpdated(bridge_);
    }

    /**
     * @notice this function is used to set bridge limits
     * @dev it can only be updated by owner
     * @param updates_ can be used to set mint and burn limits for all siblings in one call.
     */
    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isLock) {
                _consumePartLimit(
                    0,
                    _lockLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _lockLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _lockLimitParams[updates_[i].siblingChainSlug]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _unlockLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _unlockLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _unlockLimitParams[updates_[i].siblingChainSlug]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    /**
     * @notice this function is called by users to bridge their funds to a sibling chain
     * @dev it is payable to receive message bridge fees to be paid.
     * @param receiver_ address receiving bridged tokens
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param amount_ amount bridged
     * @param msgGasLimit_ min gas limit needed for execution at destination
     * @param payload_ payload which is executed at destination with bridged amount at receiver address.
     * @param options_ additional message bridge options can be provided using this param
     */
    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 amount_,
        uint256 msgGasLimit_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable {
        if (receiver_ == address(0)) revert ZeroAddressReceiver();
        if (amount_ == 0) revert ZeroAmount();

        if (_lockLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingChainSlugUnavailable();

        _consumeFullLimit(amount_, _lockLimitParams[siblingChainSlug_]); // reverts on limit hit

        token__.safeTransferFrom(msg.sender, address(this), amount_);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);
        bytes32 returnedMessageId = bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(receiver_, amount_, messageId, payload_),
            options_
        );
        if (returnedMessageId != messageId) revert MessageIdMisMatched();
        emit TokensDeposited(
            siblingChainSlug_,
            msg.sender,
            receiver_,
            amount_,
            messageId
        );
    }

    /**
     * @notice this function can be used to unlock funds which were in pending state due to limits
     * @param receiver_ address receiving bridged tokens
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param identifier_ message identifier where message was received to unlock funds
     */
    function unlockPendingFor(
        address receiver_,
        uint32 siblingChainSlug_,
        bytes32 identifier_
    ) external nonReentrant {
        if (_unlockLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingChainSlugUnavailable();

        uint256 pendingUnlock = pendingUnlocks[siblingChainSlug_][receiver_][
            identifier_
        ];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingUnlock,
            _unlockLimitParams[siblingChainSlug_]
        );

        pendingUnlocks[siblingChainSlug_][receiver_][
            identifier_
        ] = pendingAmount;
        siblingPendingUnlocks[siblingChainSlug_] -= consumedAmount;

        token__.safeTransfer(receiver_, consumedAmount);

        address receiver = pendingExecutions[identifier_].receiver;
        if (pendingAmount == 0 && receiver != address(0)) {
            if (receiver_ != receiver) revert InvalidReceiver();

            uint32 siblingChainSlug = pendingExecutions[identifier_]
                .siblingChainSlug;
            if (siblingChainSlug != siblingChainSlug_)
                revert InvalidSiblingChainSlug();

            // execute
            pendingExecutions[identifier_].isAmountPending = false;
            bool success = executionHelper__.execute(
                receiver_,
                pendingExecutions[identifier_].payload
            );
            if (success) _clearPayload(identifier_);
        }

        emit PendingTokensTransferred(
            siblingChainSlug_,
            receiver_,
            consumedAmount,
            pendingAmount,
            identifier_
        );
    }

    /**
     * @notice this function receives the message from message bridge
     * @dev Only bridge can call this function.
     * @param siblingChainSlug_ The unique identifier of the sibling chain.
     * @param payload_ payload which is decoded to get `receiver`, `amount to mint`, `message id` and `payload` to execute after token transfer.
     */
    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
        if (msg.sender != address(bridge__)) revert NotMessageBridge();

        if (_unlockLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingChainSlugUnavailable();

        (
            address receiver,
            uint256 unlockAmount,
            bytes32 identifier,
            bytes memory execPayload
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        if (
            receiver == address(this) ||
            receiver == address(bridge__) ||
            receiver == address(token__)
        ) revert CannotExecuteOnBridgeContracts();

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            unlockAmount,
            _unlockLimitParams[siblingChainSlug_]
        );

        token__.safeTransfer(receiver, consumedAmount);

        if (pendingAmount > 0) {
            pendingUnlocks[siblingChainSlug_][receiver][
                identifier
            ] = pendingAmount;
            siblingPendingUnlocks[siblingChainSlug_] += pendingAmount;

            // cache payload
            if (execPayload.length > 0)
                _cachePayload(
                    identifier,
                    true,
                    siblingChainSlug_,
                    receiver,
                    execPayload
                );

            emit TokensPending(
                siblingChainSlug_,
                receiver,
                pendingAmount,
                pendingUnlocks[siblingChainSlug_][receiver][identifier],
                identifier
            );
        } else if (execPayload.length > 0) {
            // execute
            bool success = executionHelper__.execute(receiver, execPayload);

            if (!success)
                _cachePayload(
                    identifier,
                    false,
                    siblingChainSlug_,
                    receiver,
                    execPayload
                );
        }

        emit TokensUnlocked(
            siblingChainSlug_,
            receiver,
            consumedAmount,
            identifier
        );
    }

    function getCurrentLockLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_lockLimitParams[siblingChainSlug_]);
    }

    function getCurrentUnlockLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_unlockLimitParams[siblingChainSlug_]);
    }

    function getLockLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _lockLimitParams[siblingChainSlug_];
    }

    function getUnlockLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _unlockLimitParams[siblingChainSlug_];
    }
}
