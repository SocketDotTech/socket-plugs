// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/utils/math/Math.sol";
import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
import {IStrategy} from "../interfaces/IStrategy.sol";
import {IMintableERC20} from "../interfaces/IMintableERC20.sol";
import "solmate/utils/SafeTransferLib.sol";
import {IConnector} from "../ConnectorPlug.sol";

import "./plugins/LimitPlugin.sol";
import "./plugins/ExecutionHelper.sol";
import "./plugins/ConnectorPoolPlugin.sol";

interface IYieldToken {
    function updateYield(uint256 amount_) external;

    function calculateMintAmount(uint256 amount_) external returns (uint256);

    function convertToShares(uint256 assets) external view returns (uint256);
}

// limits on underlying or visible tokens
contract YieldTokenLimitExecutionHook is
    LimitPlugin,
    ExecutionHelper,
    ConnectorPoolPlugin
{
    using SafeTransferLib for IMintableERC20;
    using FixedPointMathLib for uint256;

    uint256 public constant MAX_BPS = 10_000;
    IYieldToken public immutable asset__;

    // total yield
    uint256 public totalYield;
    mapping(address => uint256) public lastSyncTimestamp;

    // if true, no funds can be invested in the strategy
    bool public emergencyShutdown;

    event ShutdownStateUpdated(bool shutdownState);

    modifier notShutdown() {
        if (emergencyShutdown) revert VaultShutdown();
        _;
    }

    constructor(
        address asset_,
        address controller_
    ) HookBase(msg.sender, controller_) {
        asset__ = IYieldToken(asset_);
    }

    // assumed transfer info inputs are validated at controller
    // transfer info data is untrusted
    function srcPreHookCall(
        SrcPreHookCallParams calldata params_
    )
        external
        notShutdown
        isVaultOrToken
        returns (TransferInfo memory transferInfo, bytes memory postSrcHookData)
    {
        uint256 amount = params_.transferInfo.amount;
        _poolSrcHook(params_.connector, amount);
        _limitSrcHook(params_.connector, amount);
        postSrcHookData = abi.encode(amount);

        totalYield -= amount;
        transferInfo = params_.transferInfo;
        transferInfo.amount = asset__.convertToShares(amount);
    }

    function srcPostHookCall(
        SrcPostHookCallParams memory srcPostHookCallParams_
    )
        external
        notShutdown
        isVaultOrToken
        returns (TransferInfo memory transferInfo)
    {
        asset__.updateYield(totalYield);

        transferInfo.receiver = srcPostHookCallParams_.transferInfo.receiver;
        transferInfo.data = abi.encode(
            srcPostHookCallParams_.options,
            srcPostHookCallParams_.transferInfo.data
        );
        transferInfo.amount = abi.decode(
            srcPostHookCallParams_.postSrcHookData,
            (uint256)
        );
    }

    /**
     * @notice This function is called before the execution of a destination hook.
     * @dev It checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
     */
    function dstPreHookCall(
        DstPreHookCallParams calldata params_
    )
        external
        notShutdown
        isVaultOrToken
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        (uint256 newYield, ) = abi.decode(
            params_.transferInfo.data,
            (uint256, bytes)
        );

        uint256 oldYield = _poolDstHook(params_.connector, newYield, false);
        totalYield = totalYield + newYield - oldYield;

        if (params_.transferInfo.amount == 0)
            return (abi.encode(0, 0), transferInfo);

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        uint256 sharesToMint = asset__.calculateMintAmount(consumedAmount);

        postHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = params_.transferInfo;
        transferInfo.amount = sharesToMint;
    }

    /**
     * @notice Handles post-hook logic after the execution of a destination hook.
     * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
     */
    function dstPostHookCall(
        DstPostHookCallParams calldata params_
    ) external notShutdown isVaultOrToken returns (CacheData memory cacheData) {
        asset__.updateYield(totalYield);

        bytes memory execPayload = params_.transferInfo.data;
        (, uint256 pendingAmount) = abi.decode(
            params_.postHookData,
            (uint256, uint256)
        );

        uint256 connectorPendingAmount = abi.decode(
            params_.connectorCache,
            (uint256)
        );

        if (pendingAmount > 0) {
            cacheData.connectorCache = abi.encode(
                connectorPendingAmount + pendingAmount
            );
            // if pending amount is more than 0, payload is cached
            if (execPayload.length > 0) {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector,
                    execPayload
                );
            } else {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector,
                    bytes("")
                );
            }

            // emit TokensPending(
            //     siblingChainSlug_,
            //     receiver_,
            //     pendingAmount,
            //     pendingMints[siblingChainSlug_][receiver_][identifier],
            //     identifier
            // );
        } else if (execPayload.length > 0) {
            // execute
            bool success = _execute(params_.transferInfo.receiver, execPayload);

            if (success) cacheData.identifierCache = new bytes(0);
            else {
                cacheData.identifierCache = abi.encode(
                    params_.transferInfo.receiver,
                    0,
                    params_.connector,
                    execPayload
                );
            }

            cacheData.connectorCache = params_.connectorCache;
        }
    }

    // /**
    //  * @notice Handles pre-retry hook logic before execution.
    //  * @dev This function can be used to mint funds which were in a pending state due to limits.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @return updatedReceiver The updated receiver of the funds.
    //  * @return consumedAmount The amount consumed from the limit.
    //  * @return postRetryHookData The post-hook data to be processed after the retry hook execution.
    //  */
    function preRetryHook(
        PreRetryHookCallParams calldata params_
    )
        external
        notShutdown
        isVaultOrToken
        returns (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        )
    {
        (address receiver, uint256 pendingMint, address connector, ) = abi
            .decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );
        if (connector != params_.connector) revert InvalidConnector();

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            pendingMint
        );
        uint256 sharesToMint = asset__.calculateMintAmount(consumedAmount);

        postRetryHookData = abi.encode(consumedAmount, pendingAmount);
        transferInfo = TransferInfo(receiver, sharesToMint, bytes(""));
    }

    // /**
    //  * @notice Handles post-retry hook logic after execution.
    //  * @dev This function updates the identifier cache and sibling chain cache based on the post-hook data.
    //  * @param siblingChainSlug_ The unique identifier of the sibling chain.
    //  * @param identifierCache_ Identifier cache containing pending mint information.
    //  * @param connectorCache_ Sibling chain cache containing pending amount information.
    //  * @param postRetryHookData_ The post-hook data containing updated receiver and consumed/pending amounts.
    //  * @return newIdentifierCache The updated identifier cache.
    //  * @return newConnectorCache The updated sibling chain cache.
    //  */
    function postRetryHook(
        PostRetryHookCallParams calldata params_
    ) external isVaultOrToken notShutdown returns (CacheData memory cacheData) {
        (
            address receiver,
            uint256 pendingMint,
            address connector,
            bytes memory execPayload
        ) = abi.decode(
                params_.cacheData.identifierCache,
                (address, uint256, address, bytes)
            );

        (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
            params_.postRetryHookData,
            (uint256, uint256)
        );

        if (pendingAmount == 0 && receiver != address(0)) {
            // receiver is not an input from user, can receiver check
            // no connector check required here, as already done in preRetryHook call in same tx

            // execute
            bool success = _execute(receiver, execPayload);
            if (success) cacheData.identifierCache = new bytes(0);
            else
                cacheData.identifierCache = abi.encode(
                    receiver,
                    0,
                    connector,
                    execPayload
                );
        } else {
            cacheData.identifierCache = abi.encode(
                receiver,
                pendingMint - consumedAmount,
                connector,
                execPayload
            );
        }
        uint256 connectorPendingAmount = abi.decode(
            params_.cacheData.connectorCache,
            (uint256)
        );

        cacheData.connectorCache = abi.encode(
            connectorPendingAmount - consumedAmount
        );
    }

    function updateEmergencyShutdownState(
        bool shutdownState_
    ) external onlyOwner {
        emergencyShutdown = shutdownState_;
        emit ShutdownStateUpdated(shutdownState_);
    }
}
