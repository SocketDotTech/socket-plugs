pragma solidity 0.8.13;

import "solmate/utils/SafeTransferLib.sol";
import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {Gauge} from "./Gauge.sol";
import {IConnector, IHub} from "./ConnectorPlug.sol";

// @todo: separate our connecter plugs
contract Vault is Gauge, IHub, Ownable2Step {
    using SafeTransferLib for ERC20;
    ERC20 public token__;
    uint32 immutable _appChainSlug;

    struct UpdateLimitParams {
        bool isLock;
        address connector;
        uint256 maxLimit;
        uint256 ratePerSecond;
    }

    // connector => receiver => pendingUnlock
    mapping(address => mapping(address => uint256)) public pendingUnlocks;

    // connector => amount
    mapping(address => uint256) public totalPendingUnlocks;

    // connector => lockLimitParams
    mapping(address => LimitParams) _lockLimitParams;

    // connector => unlockLimitParams
    mapping(address => LimitParams) _unlockLimitParams;

    error ConnectorUnavailable();
    error LengthMismatch();

    constructor(address token_, uint32 appChainSlug_) {
        token__ = ERC20(token_);
        _appChainSlug = appChainSlug_;
    }

    function updateLimitParams(
        UpdateLimitParams[] calldata updates_
    ) external onlyOwner {
        for (uint256 i; i < updates_.length; i++) {
            if (updates_[i].isLock) {
                _lockLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _lockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            } else {
                _unlockLimitParams[updates_[i].connector].maxLimit = updates_[i]
                    .maxLimit;
                _unlockLimitParams[updates_[i].connector]
                    .ratePerSecond = updates_[i].ratePerSecond;
            }
        }
    }

    function depositToAppChain(
        address receiver_,
        uint256 amount_,
        uint256 gasLimit_,
        address connector_
    ) external payable {
        if (_lockLimitParams[connector_].maxLimit == 0)
            revert ConnectorUnavailable();

        _consumeFullLimit(amount_, _lockLimitParams[connector_]); // reverts on limit hit

        token__.safeTransferFrom(msg.sender, address(this), amount_);

        IConnector(connector_).outbound{value: msg.value}(
            gasLimit_,
            abi.encode(receiver_, amount_)
        );
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
        totalPendingUnlocks[connector_] -= consumedAmount;

        token__.safeTransfer(receiver_, consumedAmount);
    }

    // receive inbound assuming connector called
    // if connector is not configured (malicious), its unlock amount will forever stay in pending
    function receiveInbound(bytes memory payload_) external override {
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
            totalPendingUnlocks[msg.sender] += consumedAmount;
        }
        token__.safeTransfer(receiver, consumedAmount);
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
}
