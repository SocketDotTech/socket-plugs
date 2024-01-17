pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";

import {Gauge} from "../common/Gauge.sol";
import {ISuperTokenOrVault} from "./ISuperTokenOrVault.sol";
import {IMessageBridge} from "./IMessageBridge.sol";
import {AccessControl} from "../common/AccessControl.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";
import "./Execute.sol";

contract SuperTokenVault is Gauge, ISuperTokenOrVault, AccessControl, Execute {
    using SafeTransferLib for ERC20;
    ERC20 public immutable token__;
    IMessageBridge public bridge__;

    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    struct UpdateLimitParams {
        bool isLock;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    // siblingChainSlug => receiver => identifier => pendingUnlock
    mapping(uint32 => mapping(address => mapping(bytes32 => uint256)))
        public pendingUnlocks;

    // siblingChainSlug => amount
    mapping(uint32 => uint256) public siblingPendingUnlocks;

    // siblingChainSlug => lockLimitParams
    mapping(uint32 => LimitParams) _lockLimitParams;

    // siblingChainSlug => unlockLimitParams
    mapping(uint32 => LimitParams) _unlockLimitParams;

    error SiblingChainSlugUnavailable();
    error ZeroAmount();
    error NotPlug();

    event PlugUpdated(address plug);
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event TokensDeposited(
        uint32 siblingChainSlug,
        address depositor,
        address receiver,
        uint256 depositAmount
    );
    event PendingTokensTransferred(
        uint32 siblingChainSlug,
        address receiver,
        uint256 unlockedAmount,
        uint256 pendingAmount
    );
    event TokensPending(
        uint32 siblingChainSlug,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount
    );
    event TokensUnlocked(
        uint32 siblingChainSlug,
        address receiver,
        uint256 unlockedAmount
    );

    constructor(
        address token_,
        address owner_,
        address plug_
    ) AccessControl(owner_) {
        token__ = ERC20(token_);
        bridge__ = IMessageBridge(plug_);
    }

    function updatePlug(address plug_) external onlyOwner {
        bridge__ = IMessageBridge(plug_);
        emit PlugUpdated(plug_);
    }

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

    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 amount_,
        uint256 msgGasLimit_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable {
        if (amount_ == 0) revert ZeroAmount();

        if (_lockLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingChainSlugUnavailable();

        _consumeFullLimit(amount_, _lockLimitParams[siblingChainSlug_]); // reverts on limit hit

        token__.safeTransferFrom(msg.sender, address(this), amount_);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);
        bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(receiver_, amount_, messageId, payload_),
            options_
        );

        emit TokensDeposited(siblingChainSlug_, msg.sender, receiver_, amount_);
    }

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

        if (
            pendingAmount == 0 &&
            pendingExecutions[identifier_].receiver != address(0)
        ) {
            // execute
            pendingExecutions[identifier_].isAmountPending = false;
            bool success = _execute(
                receiver_,
                pendingExecutions[identifier_].payload
            );
            if (success) _clearPayload(identifier_);
        }

        emit PendingTokensTransferred(
            siblingChainSlug_,
            receiver_,
            consumedAmount,
            pendingAmount
        );
    }

    function inbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
        if (msg.sender != address(bridge__)) revert NotPlug();

        if (_unlockLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingChainSlugUnavailable();

        (
            address receiver,
            uint256 unlockAmount,
            bytes32 identifier,
            bytes memory execPayload
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            unlockAmount,
            _unlockLimitParams[siblingChainSlug_]
        );

        token__.safeTransfer(receiver, consumedAmount);

        if (pendingAmount > 0) {
            // add instead of overwrite to handle case where already pending amount is left
            pendingUnlocks[siblingChainSlug_][receiver][
                identifier
            ] += pendingAmount;
            siblingPendingUnlocks[siblingChainSlug_] += pendingAmount;

            // cache payload
            if (execPayload.length > 0)
                _cachePayload(
                    identifier,
                    siblingChainSlug_,
                    true,
                    receiver,
                    execPayload
                );

            emit TokensPending(
                siblingChainSlug_,
                receiver,
                pendingAmount,
                pendingUnlocks[siblingChainSlug_][receiver][identifier]
            );
        } else if (execPayload.length > 0) {
            // execute
            bool success = _execute(receiver, execPayload);

            if (!success)
                _cachePayload(
                    identifier,
                    siblingChainSlug_,
                    false,
                    receiver,
                    execPayload
                );
        }

        emit TokensUnlocked(siblingChainSlug_, receiver, consumedAmount);
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

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyRole(RESCUE_ROLE) {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
