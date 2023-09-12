pragma solidity 0.8.13;

import "solmate/tokens/ERC20.sol";
import "solmate/auth/Owned.sol";
import "../Gauge.sol";
import "./CrossChainConnector.sol";


contract CrossChainToken is ERC20, Gauge, Owned, IHub {

    struct UpdateLimitParams {
        bool isMint;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    // connector => mintLimitParams
    mapping(address => LimitParams) _receivingLimitParams;

    // connector => burnLimitParams
    mapping(address => LimitParams) _sendingLimitParams;

    // connector => receiver => identifier => amount
    mapping(address => mapping(address => mapping(bytes32 => uint256))) public pendingMints;

    // connector => amount
    mapping(address => uint256) public connectorPendingMints;


    error ConnectorUnavailable();

    
    event LimitParamsUpdated(UpdateLimitParams[] updates);

    event BridgeTokens(
        address connector,
        address withdrawer,
        address receiver,
        uint256 bridgedAmount,
        bytes32 identifier
    );

    event PendingTokensBridged(
        address connector,
        address receiver,
        uint256 mintAmount,
        uint256 pendingAmount,
        bytes32 identifier
    );
    event TokensPending(
        address connecter,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        bytes32 identifier
    );
    event TokensBridged(address connecter, address receiver, uint256 mintAmount, uint256 totalAmount, bytes32 identifier);


    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        address owner_
    ) ERC20(name_, symbol_, decimals_) Owned(owner_) {}


    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyOwner {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isMint) {
                _consumePartLimit(0, _receivingLimitParams[updates_[i].connector]); // to keep current limit in sync
                _receivingLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _receivingLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(0, _sendingLimitParams[updates_[i].connector]); // to keep current limit in sync
                _sendingLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _sendingLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function bridgeToChain(
        address receiver_,
        uint256 sendingAmount_,
        uint256 msgGasLimit_,
        address destinationConnector_
    ) external payable {
        if (_sendingLimitParams[destinationConnector_].maxLimit == 0)
            revert ConnectorUnavailable();

        _consumeFullLimit(sendingAmount_, _sendingLimitParams[destinationConnector_]); // reverts on limit hit

        _burn(msg.sender, sendingAmount_);

        // FIXME: generate messageId
        bytes32 messageId = bytes32(0);

        IConnector(destinationConnector_).outbound{value: msg.value}(
            msgGasLimit_,
            abi.encode(receiver_, sendingAmount_, messageId)
        );

        emit BridgeTokens(
            destinationConnector_,
            msg.sender,
            receiver_,
            sendingAmount_,
            messageId
        );
    }
    
    function mintPendingFor(address receiver_, address connector_, bytes32 identifier) external {
        if (_receivingLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        uint256 pendingMint = pendingMints[connector_][receiver_][identifier];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingMint,
            _receivingLimitParams[connector_]
        );

        pendingMints[connector_][receiver_][identifier] = pendingAmount;
        connectorPendingMints[connector_] -= consumedAmount;

        _mint(receiver_, consumedAmount);

        emit PendingTokensBridged(
            connector_,
            receiver_,
            consumedAmount,
            pendingAmount,
            identifier
        );
    }

    // receive inbound assuming connector called
    function receiveInbound(bytes memory payload_) external override {
        if (_receivingLimitParams[msg.sender].maxLimit == 0)
            revert ConnectorUnavailable();

        (address receiver, uint256 mintAmount, bytes32 identifier) = abi.decode(
            payload_,
            (address, uint256, bytes32)
        );

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            mintAmount,
            _receivingLimitParams[msg.sender]
        );

        if (pendingAmount > 0) {
            pendingMints[msg.sender][receiver][identifier] += pendingAmount;
            connectorPendingMints[msg.sender] += pendingAmount;

            emit TokensPending(
                msg.sender,
                receiver,
                pendingAmount,
                pendingMints[msg.sender][receiver][identifier],
                identifier
            );
        }

        _mint(receiver, consumedAmount);

        emit TokensBridged(msg.sender, receiver, consumedAmount, mintAmount, identifier);
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }

    function getCurrentReceivingLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_receivingLimitParams[connector_]);
    }

    function getCurrentSendingLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_sendingLimitParams[connector_]);
    }

    function getReceivingLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _receivingLimitParams[connector_];
    }

    function getSendingLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _sendingLimitParams[connector_];
    }

}
