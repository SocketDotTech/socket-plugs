pragma solidity 0.8.13;

import "./plugins/LimitPlugin.sol";
import "./plugins/ExecutionHelper.sol";
import "./plugins/ConnectorPoolPlugin.sol";
import "../interfaces/IController.sol";

contract LimitExecutionHook is LimitPlugin, ConnectorPoolPlugin {
    bool public useControllerPools;
    ExecutionHelper executionHelper__;

    event MessageExecuted(bytes32 indexed messageId, address indexed receiver);

    /**
     * @notice Constructor for creating a new SuperToken.
     * @param owner_ Owner of this contract.
     */
    constructor(
        address owner_,
        address controller_,
        address executionHelper_,
        bool useControllerPools_
    ) HookBase(owner_, controller_) {
        useControllerPools = useControllerPools_;
        executionHelper__ = ExecutionHelper(executionHelper_);
        hookType = LIMIT_EXECUTION_HOOK;
    }

    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        public
        virtual
        isVaultOrToken
        returns (TransferInfo memory, bytes memory)
    {
        if (useControllerPools)
            _poolSrcHook(params_.connector, params_.transferInfo.amount);
        _limitSrcHook(params_.connector, params_.transferInfo.amount);
        return (params_.transferInfo, bytes(""));
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory params_
    ) public virtual isVaultOrToken returns (TransferInfo memory) {
        return params_.transferInfo;
    }

    function dstPreHookCall(
        DstPreHookCallParams calldata params_
    )
        public
        virtual
        isVaultOrToken
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        if (useControllerPools)
            _poolDstHook(params_.connector, params_.transferInfo.amount, true);

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = params_.transferInfo;
        transferInfo.amount = consumedAmount;
    }

    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) public virtual isVaultOrToken returns (CacheData memory cacheData) {
        bytes memory execPayload = params_.transferInfo.data;

        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            params_.postHookData,
            (uint256, uint256)
        );

        uint256 connectorPendingAmount = _getConnectorPendingAmount(
            params_.connectorCache
        );
        cacheData.connectorCache = abi.encode(
            connectorPendingAmount + pendingAmount
        );
        cacheData.identifierCache = abi.encode(
            params_.transferInfo.receiver,
            pendingAmount,
            params_.connector,
            execPayload
        );

        if (pendingAmount > 0) {
            emit TokensPending(
                params_.connector,
                params_.transferInfo.receiver,
                consumedAmount,
                pendingAmount,
                params_.messageId
            );
        } else {
            if (execPayload.length > 0) {
                // execute
                bool success = executionHelper__.execute(
                    params_.transferInfo.receiver,
                    execPayload
                );

                if (success) {
                    emit MessageExecuted(
                        params_.messageId,
                        params_.transferInfo.receiver
                    );
                    cacheData.identifierCache = new bytes(0);
                }
            } else cacheData.identifierCache = new bytes(0);
        }
    }

    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        public
        virtual
        isVaultOrToken
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (
            address receiver,
            uint256 pendingMint,
            address connector,
            bytes memory execPayload
        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );

        if (connector != params_.connector) revert InvalidConnector();

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            pendingMint
        );

        postRetryHookData = abi.encode(receiver, consumedAmount, pendingAmount);
        transferInfo = TransferInfo(receiver, consumedAmount, bytes(""));
    }

    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) public virtual isVaultOrToken returns (CacheData memory cacheData) {
        (
            ,
            uint256 pendingMint,
            address connector,
            bytes memory execPayload
        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );

        (address receiver, uint256 consumedAmount, uint256 pendingAmount) = abi
            .decode(params_.postRetryHookData, (address, uint256, uint256));

        uint256 connectorPendingAmount = _getConnectorPendingAmount(
            params_.cacheData.connectorCache
        );

        cacheData.connectorCache = abi.encode(
            connectorPendingAmount - consumedAmount
        );
        cacheData.identifierCache = abi.encode(
            receiver,
            pendingAmount,
            connector,
            execPayload
        );

        emit PendingTokensBridged(
            params_.connector,
            receiver,
            consumedAmount,
            pendingAmount,
            params_.messageId
        );

        if (pendingAmount == 0) {
            // receiver is not an input from user, can receiver check
            // no connector check required here, as already done in preRetryHook call in same tx

            // execute
            bool success = executionHelper__.execute(receiver, execPayload);
            if (success) {
                emit MessageExecuted(params_.messageId, receiver);
                cacheData.identifierCache = new bytes(0);
            }
        }
    }

    function getConnectorPendingAmount(
        address connector_
    ) external returns (uint256) {
        bytes memory cache = IController(controller).connectorCache(connector_);
        return _getConnectorPendingAmount(cache);
    }

    function _getIdentifierPendingAmount(
        bytes memory identifierCache_
    ) internal view returns (uint256) {
        if (identifierCache_.length > 0) {
            (
                address receiver,
                uint256 pendingAmount,
                address connector,
                bytes memory payload
            ) = abi.decode(
                    identifierCache_,
                    (address, uint256, address, bytes)
                );
            return pendingAmount;
        } else return 0;
    }

    function getIdentifierPendingAmount(
        bytes32 messageId_
    ) external returns (uint256) {
        bytes memory cache = IController(controller).identifierCache(
            messageId_
        );
        return _getIdentifierPendingAmount(cache);
    }
}
