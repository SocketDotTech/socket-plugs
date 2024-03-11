pragma solidity 0.8.13;
import "../HookBase.sol";

abstract contract ConnectorPoolPlugin is HookBase {
    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    event ConnectorPoolIdUpdated(address connector, uint256 poolId);

    function updateConnectorPoolId(
        address[] calldata connectors,
        uint256[] calldata poolIds
    ) external onlyOwner {
        uint256 length = connectors.length;
        for (uint256 i; i < length; i++) {
            if (poolIds[i] == 0) revert InvalidPoolId();
            connectorPoolIds[connectors[i]] = poolIds[i];
            emit ConnectorPoolIdUpdated(connectors[i], poolIds[i]);
        }
    }

    function _poolSrcHook(address connector_, uint256 amount_) internal {
        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();
        if (amount_ > poolLockedAmounts[connectorPoolId])
            revert InsufficientFunds();

        poolLockedAmounts[connectorPoolId] -= amount_; // underflow revert expected
    }

    function _poolDstHook(
        address connector_,
        uint256 amount_,
        bool isIncreased
    ) internal returns (uint256 oldLockedAmount) {
        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();

        oldLockedAmount = poolLockedAmounts[connectorPoolId];
        if (isIncreased) {
            _increaseLockedAmount(connectorPoolId, amount_);
        } else _setLockedAmount(connectorPoolId, amount_);
    }

    function _setLockedAmount(
        uint256 connectorPoolId_,
        uint256 amount_
    ) internal {
        poolLockedAmounts[connectorPoolId_] = amount_;
    }

    function _increaseLockedAmount(
        uint256 connectorPoolId_,
        uint256 amount_
    ) internal {
        poolLockedAmounts[connectorPoolId_] += amount_;
    }
}
