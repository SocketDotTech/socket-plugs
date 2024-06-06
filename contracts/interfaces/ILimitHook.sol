// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;
import "./IHook.sol";

interface ILimitHook is IHook {
    function updateLimitParams(UpdateLimitParams[] calldata updates) external;

    function checkLimit(address user, uint256 amount) external view;

    function getIdentifierPendingAmount(
        bytes32 messageId_
    ) external returns (uint256);

    function getConnectorPendingAmount(
        address connector_
    ) external returns (uint256);

    function getCurrentReceivingLimit(
        address connector_
    ) external view returns (uint256);

    function getCurrentSendingLimit(
        address connector_
    ) external view returns (uint256);

    function getReceivingLimitParams(
        address connector_
    ) external view returns (LimitParams memory);

    function getSendingLimitParams(
        address connector_
    ) external view returns (LimitParams memory);
}
