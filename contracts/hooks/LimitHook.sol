// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

import "./plugins/LimitPlugin.sol";
import "../interfaces/IController.sol";
import "./plugins/ConnectorPoolPlugin.sol";

contract LimitHook is LimitPlugin, ConnectorPoolPlugin {
    bool public immutable useControllerPools;

    /**
     * @notice Constructor for creating a new SuperToken.
     * @param owner_ Owner of this contract.
     */
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_
    ) HookBase(owner_, controller_) {
        useControllerPools = useControllerPools_;
        hookType = LIMIT_HOOK;
        _grantRole(LIMIT_UPDATER_ROLE, owner_);
    }

    function srcPreHookCall(
        SrcPreHookCallParams memory params_
    )
        external
        isVaultOrController
        returns (TransferInfo memory transferInfo, bytes memory postHookData)
    {
        if (useControllerPools)
            _poolSrcHook(params_.connector, params_.transferInfo.amount);

        _limitSrcHook(params_.connector, params_.transferInfo.amount);
        transferInfo = params_.transferInfo;
        postHookData = hex"";
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory params_
    ) external view isVaultOrController returns (TransferInfo memory) {
        return params_.transferInfo;
    }

    function dstPreHookCall(
        DstPreHookCallParams memory params_
    )
        external
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        if (useControllerPools)
            _poolDstHook(params_.connector, params_.transferInfo.amount);

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = params_.transferInfo;
        transferInfo.amount = consumedAmount;
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) external isVaultOrController returns (CacheData memory cacheData) {
        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            params_.postHookData,
            (uint256, uint256)
        );
        uint256 connectorPendingAmount = _getConnectorPendingAmount(
            params_.connectorCache
        );
        if (pendingAmount > 0) {
            cacheData = CacheData(
                abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector
                ),
                abi.encode(connectorPendingAmount + pendingAmount)
            );

            emit TokensPending(
                params_.connector,
                params_.transferInfo.receiver,
                consumedAmount,
                pendingAmount,
                params_.messageId
            );
        } else {
            cacheData = CacheData(
                bytes(""),
                abi.encode(connectorPendingAmount + pendingAmount)
            );
        }
    }

    function preRetryHook(
        PreRetryHookCallParams memory params_
    )
        external
        nonReentrant
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (address receiver, uint256 pendingMint, address connector) = abi.decode(
            params_.cacheData.identifierCache,
            (address, uint256, address)
        );

        if (connector != params_.connector) revert InvalidConnector();

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            pendingMint
        );

        postHookData = abi.encode(receiver, consumedAmount, pendingAmount);
        transferInfo = TransferInfo(receiver, consumedAmount, bytes(""));
    }

    function postRetryHook(
        PostRetryHookCallParams calldata params_
    )
        external
        isVaultOrController
        nonReentrant
        returns (CacheData memory cacheData)
    {
        (address receiver, uint256 consumedAmount, uint256 pendingAmount) = abi
            .decode(params_.postHookData, (address, uint256, uint256));

        // code reaches here after minting/unlocking the pending amount
        emit PendingTokensBridged(
            params_.connector,
            receiver,
            consumedAmount,
            pendingAmount,
            params_.messageId
        );

        uint256 connectorPendingAmount = _getConnectorPendingAmount(
            params_.cacheData.connectorCache
        );
        cacheData.connectorCache = abi.encode(
            connectorPendingAmount - consumedAmount
        );
        cacheData.identifierCache = abi.encode(
            receiver,
            pendingAmount,
            params_.connector
        );

        if (pendingAmount == 0) {
            cacheData.identifierCache = new bytes(0);
        }
    }

    function getConnectorPendingAmount(
        address connector_
    ) external returns (uint256) {
        bytes memory cache = IController(vaultOrController).connectorCache(
            connector_
        );
        return _getConnectorPendingAmount(cache);
    }

    function _getIdentifierPendingAmount(
        bytes memory identifierCache_
    ) internal pure returns (uint256) {
        if (identifierCache_.length > 0) {
            (, uint256 pendingAmount, ) = abi.decode(
                identifierCache_,
                (address, uint256, address)
            );
            return pendingAmount;
        } else return 0;
    }

    function getIdentifierPendingAmount(
        bytes32 messageId_
    ) external returns (uint256) {
        bytes memory cache = IController(vaultOrController).identifierCache(
            messageId_
        );
        return _getIdentifierPendingAmount(cache);
    }
}
