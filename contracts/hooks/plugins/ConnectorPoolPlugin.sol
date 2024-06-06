// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "../HookBase.sol";

abstract contract ConnectorPoolPlugin is HookBase {
    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    event ConnectorPoolIdUpdated(address connector, uint256 poolId);
    event PoolLockedAmountUpdated(uint256 poolId, uint256 amount);

    function updateConnectorPoolId(
        address[] calldata connectors,
        uint256[] calldata poolIds_
    ) external onlyOwner {
        uint256 length = connectors.length;
        for (uint256 i; i < length; i++) {
            if (poolIds_[i] == 0) revert InvalidPoolId();
            connectorPoolIds[connectors[i]] = poolIds_[i];
            emit ConnectorPoolIdUpdated(connectors[i], poolIds_[i]);
        }
    }

    function updatePoolLockedAmounts(
        uint256[] calldata poolIds_,
        uint256[] calldata amounts_
    ) external onlyOwner {
        uint256 length = poolIds_.length;
        for (uint256 i; i < length; i++) {
            if (poolIds_[i] == 0) revert InvalidPoolId();
            poolLockedAmounts[poolIds_[i]] = amounts_[i];
            emit PoolLockedAmountUpdated(poolIds_[i], amounts_[i]);
        }
    }

    function _poolSrcHook(address connector_, uint256 amount_) internal {
        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();
        if (amount_ > poolLockedAmounts[connectorPoolId])
            revert InsufficientFunds();

        poolLockedAmounts[connectorPoolId] -= amount_;
    }

    function _poolDstHook(
        address connector_,
        uint256 amount_
    ) internal returns (uint256 oldLockedAmount) {
        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();

        oldLockedAmount = poolLockedAmounts[connectorPoolId];
        poolLockedAmounts[connectorPoolId] += amount_;
    }
}
