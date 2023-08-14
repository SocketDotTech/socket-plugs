pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {Gauge} from "./Gauge.sol";
import {IConnector, IHub} from "./ConnectorPlug.sol";

// @todo: separate our connecter plugs
contract Vault is Gauge, IHub, Ownable2Step {
    using SafeTransferLib for ERC20;
    ERC20 public immutable token__;

    struct UpdateLimitParams {
        bool isLock;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    // connector => receiver => pendingUnlock
    mapping(address => mapping(address => uint256)) public pendingUnlocks;

    // connector => amount
    mapping(address => uint256) public connectorPendingUnlocks;

    // connector => lockLimitParams
    mapping(address => LimitParams) _lockLimitParams;

    // connector => unlockLimitParams
    mapping(address => LimitParams) _unlockLimitParams;

    error ConnectorUnavailable();

    event LimitParamsUpdated(UpdateLimitParams[] updates);
    event TokensDeposited(
        address connector,
        address depositor,
        address receiver,
        uint256 depositAmount,
        uint32 toChainSlug
    );
    event PendingTokensTransferred(
        address connector,
        address receiver,
        uint256 unlockedAmount,
        uint256 pendingAmount
    );
    event TokensPending(
        address connector,
        address receiver,
        uint256 pendingAmount,
        uint256 totalPendingAmount,
        uint32  fromChainSlug
    );
    event TokensUnlocked(
        address connector,
        address receiver,
        uint256 unlockedAmount,
        uint32  fromChainSlug
    );

    constructor(address token_) {
        token__ = ERC20(token_);
    }

    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyOwner {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isLock) {
                _consumePartLimit(0, _lockLimitParams[updates_[i].connector]); // to keep current limit in sync
                _lockLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _lockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _consumePartLimit(0, _unlockLimitParams[updates_[i].connector]); // to keep current limit in sync
                _unlockLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _unlockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }

        emit LimitParamsUpdated(updates_);
    }

    function depositToAppChain(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_
    ) external payable {
        if (_lockLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        _consumeFullLimit(amount_, _lockLimitParams[connector_]); // reverts on limit hit

        token__.safeTransferFrom(msg.sender, address(this), amount_);

        IConnector(connector_).outbound{value: msg.value}(
            msgGasLimit_,
            abi.encode(receiver_, amount_)
        );

        emit TokensDeposited(connector_, msg.sender, receiver_, amount_, IConnector(connector_).siblingChainSlug());
    }

    function unlockPendingFor(address receiver_, address connector_) external {
        if (_unlockLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        uint256 pendingUnlock = pendingUnlocks[connector_][receiver_];
        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            pendingUnlock,
            _unlockLimitParams[connector_]
        );

        pendingUnlocks[connector_][receiver_] = pendingAmount;
        connectorPendingUnlocks[connector_] -= consumedAmount;

        token__.safeTransfer(receiver_, consumedAmount);

        emit PendingTokensTransferred(
            connector_,
            receiver_,
            consumedAmount,
            pendingAmount
        );
    }

    // receive inbound assuming connector called
    function receiveInbound(uint32 siblingChainSlug, bytes memory payload_) external override {
        if (_unlockLimitParams[msg.sender].maxLimit == 0)
            revert ConnectorUnavailable();

        (address receiver, uint256 unlockAmount) = abi.decode(
            payload_,
            (address, uint256)
        );

        (uint256 consumedAmount, uint256 pendingAmount) = _consumePartLimit(
            unlockAmount,
            _unlockLimitParams[msg.sender]
        );

        if (pendingAmount > 0) {
            // add instead of overwrite to handle case where already pending amount is left
            pendingUnlocks[msg.sender][receiver] += pendingAmount;
            connectorPendingUnlocks[msg.sender] += pendingAmount;
            emit TokensPending(
                msg.sender,
                receiver,
                pendingAmount,
                pendingUnlocks[msg.sender][receiver],
                siblingChainSlug
            );
        }
        token__.safeTransfer(receiver, consumedAmount);

        emit TokensUnlocked(msg.sender, receiver, consumedAmount, siblingChainSlug);
    }

    function getMinFees(
        address connector_,
        uint256 msgGasLimit_
    ) external view returns (uint256 totalFees) {
        return IConnector(connector_).getMinFees(msgGasLimit_);
    }

    function getCurrentLockLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_lockLimitParams[connector_]);
    }

    function getCurrentUnlockLimit(
        address connector_
    ) external view returns (uint256) {
        return _getCurrentLimit(_unlockLimitParams[connector_]);
    }

    function getLockLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _lockLimitParams[connector_];
    }

    function getUnlockLimitParams(
        address connector_
    ) external view returns (LimitParams memory) {
        return _unlockLimitParams[connector_];
    }
}
