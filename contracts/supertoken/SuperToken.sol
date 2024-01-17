pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";

import {AccessControl} from "../common/AccessControl.sol";
import {Gauge} from "../common/Gauge.sol";
import {RescueFundsLib} from "../libraries/RescueFundsLib.sol";

import "./Execute.sol";
import "./IMessageBridge.sol";
import "./ISuperTokenOrVault.sol";

/**
 * @title SuperToken
 * @notice An ERC20 contract which enables bridging a token to its sibling chains.
 * @dev This contract implements ISuperTokenOrVault to support message bridging through IMessageBridge compliant contracts.
 */
contract SuperToken is
    ERC20,
    Gauge,
    ISuperTokenOrVault,
    AccessControl,
    Execute
{
    struct UpdateLimitParams {
        bool isMint;
        uint32 siblingChainSlug;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    bytes32 constant RESCUE_ROLE = keccak256("RESCUE_ROLE");
    bytes32 constant LIMIT_UPDATER_ROLE = keccak256("LIMIT_UPDATER_ROLE");

    // bridge contract address which provides AMB support
    IMessageBridge public bridge__;

    // siblingChainSlug => mintLimitParams
    mapping(uint32 => LimitParams) _receivingLimitParams;

    // siblingChainSlug => burnLimitParams
    mapping(uint32 => LimitParams) _sendingLimitParams;

    // siblingChainSlug => receiver => identifier => amount
    mapping(uint32 => mapping(address => mapping(bytes32 => uint256)))
        public pendingMints;

    // siblingChainSlug => amount
    mapping(uint32 => uint256) public siblingPendingMints;

    ////////////////////////////////////////////////////////
    ////////////////////// ERRORS //////////////////////////
    ////////////////////////////////////////////////////////

    error SiblingNotSupported();
    error MessageIdMisMatched();
    error ZeroAmount();
    error NotMessageBridge();

    ////////////////////////////////////////////////////////
    ////////////////////// EVENTS //////////////////////////
    ////////////////////////////////////////////////////////

    // emitted when limit params are updated
    event LimitParamsUpdated(UpdateLimitParams[] updates);
    // emitted when message bridge is updated
    event MessageBridgeUpdated(address newBridge);
    // emitted at source when tokens are bridged to a sibling chain
    event BridgeTokens(
        uint32 siblingChainSlug,
        address withdrawer,
        address receiver,
        uint256 bridgedAmount,
        bytes32 identifier
    );
    // emitted when pending tokens are minted to the receiver
    event PendingTokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 pendingAmount,
        bytes32 identifier
    );
    // emitted when transfer reaches limit and token mint is added to pending queue
    event TokensPending(
        uint32 siblingChainSlug,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 identifier
    );
    // emitted when pending tokens are minted as limits are replenished
    event TokensBridged(
        uint32 siblingChainSlug,
        address receiver,
        uint256 mintAmount,
        uint256 totalAmount,
        bytes32 identifier
    );

    /**
     * @notice constructor for creating a new SuperToken.
     * @param name_ token name
     * @param symbol_ token symbol
     * @param decimals_ token decimals (should be same on all chains)
     * @param initialSupplyHolder_ address to which initial supply will be minted
     * @param owner_ owner of this contract
     * @param initialSupply_ initial supply of super token
     * @param bridge_ message bridge address
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address initialSupplyHolder_,
        address owner_,
        uint256 initialSupply_,
        address bridge_
    ) ERC20(name_, symbol_, decimals_) AccessControl(owner_) {
        _mint(initialSupplyHolder_, initialSupply_);
        bridge__ = IMessageBridge(bridge_);
    }

    function updateMessageBridge(address bridge_) external onlyOwner {
        bridge__ = IMessageBridge(bridge_);
        emit MessageBridgeUpdated(bridge_);
    }

    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyRole(LIMIT_UPDATER_ROLE) {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isMint) {
                _consumePartLimit(
                    0,
                    _receivingLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _receivingLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _receivingLimitParams[updates_[i].siblingChainSlug]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(
                    0,
                    _sendingLimitParams[updates_[i].siblingChainSlug]
                ); // to keep current limit in sync
                _sendingLimitParams[updates_[i].siblingChainSlug]
                    .maxLimit = updates_[i].maxLimit;
                _sendingLimitParams[updates_[i].siblingChainSlug]
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
     * @param sendingAmount_ amount bridged
     * @param msgGasLimit_ min gas limit needed for execution at destination
     * @param payload_ payload which is executed at destination with bridged amount at receiver address.
     * @param options_ additional message bridge options can be provided using this param
     */
    function bridge(
        address receiver_,
        uint32 siblingChainSlug_,
        uint256 sendingAmount_,
        uint256 msgGasLimit_,
        bytes calldata payload_,
        bytes calldata options_
    ) external payable {
        if (_sendingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        if (sendingAmount_ == 0) revert ZeroAmount();

        _consumeFullLimit(
            sendingAmount_,
            _sendingLimitParams[siblingChainSlug_]
        ); // reverts on limit hit
        _burn(msg.sender, sendingAmount_);

        bytes32 messageId = bridge__.getMessageId(siblingChainSlug_);

        // important to get message id as it is used as an
        // identifier for pending amount and payload caching
        bytes32 returnedMessageId = bridge__.outbound{value: msg.value}(
            siblingChainSlug_,
            msgGasLimit_,
            abi.encode(receiver_, sendingAmount_, messageId, payload_),
            options_
        );

        if (returnedMessageId != messageId) revert MessageIdMisMatched();
        emit BridgeTokens(
            siblingChainSlug_,
            msg.sender,
            receiver_,
            sendingAmount_,
            messageId
        );
    }

    function mintPendingFor(
        address receiver_,
        uint32 siblingChainSlug_,
        bytes32 identifier
    ) external nonReentrant {
        if (_receivingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        uint256 pendingMint = pendingMints[siblingChainSlug_][receiver_][
            identifier
        ];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingMint,
            _receivingLimitParams[siblingChainSlug_]
        );

        pendingMints[siblingChainSlug_][receiver_][identifier] = pendingAmount;
        siblingPendingMints[siblingChainSlug_] -= consumedAmount;

        _mint(receiver_, consumedAmount);

        if (
            pendingAmount == 0 &&
            pendingExecutions[identifier].receiver != address(0)
        ) {
            // execute
            pendingExecutions[identifier].isAmountPending = false;
            bool success = _execute(
                receiver_,
                pendingExecutions[identifier].payload
            );
            if (success) _clearPayload(identifier);
        }

        emit PendingTokensBridged(
            siblingChainSlug_,
            receiver_,
            consumedAmount,
            pendingAmount,
            identifier
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

        if (_receivingLimitParams[siblingChainSlug_].maxLimit == 0)
            revert SiblingNotSupported();

        (
            address receiver,
            uint256 mintAmount,
            bytes32 identifier,
            bytes memory execPayload
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            mintAmount,
            _receivingLimitParams[siblingChainSlug_]
        );

        if (receiver == address(this) || receiver == address(bridge__))
            revert CannotExecuteOnBridgeContracts();

        _mint(receiver, consumedAmount);

        if (pendingAmount > 0) {
            pendingMints[siblingChainSlug_][receiver][
                identifier
            ] = pendingAmount;
            siblingPendingMints[siblingChainSlug_] += pendingAmount;

            // if pending amount is more than 0, payload is cached
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
                pendingMints[siblingChainSlug_][receiver][identifier],
                identifier
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

        emit TokensBridged(
            siblingChainSlug_,
            receiver,
            consumedAmount,
            mintAmount,
            identifier
        );
    }

    function getCurrentReceivingLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[siblingChainSlug_]);
    }

    function getCurrentSendingLimit(
        uint32 siblingChainSlug_
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[siblingChainSlug_]);
    }

    function getReceivingLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[siblingChainSlug_];
    }

    function getSendingLimitParams(
        uint32 siblingChainSlug_
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[siblingChainSlug_];
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
