// // // SPDX-License-Identifier: GPL-3.0-only
pragma solidity 0.8.13;

// import "openzeppelin-contracts/contracts/utils/math/Math.sol";
// import {FixedPointMathLib} from "solmate/utils/FixedPointMathLib.sol";
// import {IStrategy} from "../interfaces/IStrategy.sol";
// import {IMintableERC20} from "../interfaces/IMintableERC20.sol";
// import "solmate/utils/SafeTransferLib.sol";
// import {IConnector} from "../ConnectorPlug.sol";

// import "./plugins/LimitPlugin.sol";
// import "./plugins/ExecutionHelper.sol";

// contract YieldTokenLimitExecutionHook is LimitPlugin, ExecutionHelper {
//     using SafeTransferLib for IMintableERC20;
//     using FixedPointMathLib for uint256;

//     uint256 public constant MAX_BPS = 10_000;
//     IMintableERC20 public immutable asset__;

//     // if true, no funds can be invested in the strategy
//     bool public emergencyShutdown;

//     event ShutdownStateUpdated(bool shutdownState);

//     modifier notShutdown() {
//         if (emergencyShutdown) revert VaultShutdown();
//         _;
//     }

//     constructor(
//         address asset_,
//         address controller_
//     ) HookBase(msg.sender, controller_) {
//         asset__ = IMintableERC20(asset_);
//         controller = controller_;
//     }

//     /**
//      * @dev This function calls the srcHookCall function of the connector contract,
//      * passing in the receiver, amount, siblingChainSlug, extradata, and msg.sender, and returns
//      * the updated receiver, amount, and extradata.
//      */
//     function srcPreHookCall(
//         SrcPreHookCallParams calldata params_
//     ) external isVaultOrToken returns (TransferInfo memory) {
//         _limitSrcHook(params_.connector, params_.transferInfo);
//         return params_.transferInfo;
//     }

//     function srcPostHookCall(
//         bytes memory options_,
//         bytes memory payload_
//     ) external returns (bytes memory) {
//         return abi.encode(abi.decode(options_, (bool)), payload_);
//     }

//     /**
//      * @notice This function is called before the execution of a destination hook.
//      * @dev It checks if the sibling chain is supported, consumes a part of the limit, and prepares post-hook data.
//      */
//     function dstPreHookCall(
//         DstPreHookCallParams calldata params_
//     )
//         external
//         isVaultOrToken
//         returns (bytes memory postHookData, TransferInfo memory transferInfo)
//     {
//         (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
//             params_.connector,
//             params_.transferInfo.amount
//         );

//         postHookData = abi.encode(consumedAmount, pendingAmount);
//         params_.transferInfo.amount = consumedAmount;
//         params_.transferInfo.data = payload_;
//         transferInfo = params_.transferInfo;
//     }

//     /**
//      * @notice Handles post-hook logic after the execution of a destination hook.
//      * @dev This function processes post-hook data to update the identifier cache and sibling chain cache.
//      */
//     function dstPostHookCall(
//         DstPostHookCallParams calldata params_
//     ) external isVaultOrToken returns (CacheData memory cacheData) {
//         bytes memory execPayload = params_.transferInfo.data;
//         (uint256 consumedAmount, uint256 pendingAmount) = abi.decode(
//             params_.postHookData,
//             (uint256, uint256)
//         );

//         uint256 connectorPendingAmount = abi.decode(
//             params_.connectorCache,
//             (uint256)
//         );

//         if (pendingAmount > 0) {
//             cacheData.connectorCache = abi.encode(
//                 connectorPendingAmount + pendingAmount
//             );
//             // if pending amount is more than 0, payload is cached
//             if (execPayload.length > 0) {
//                 cacheData.identifierCache = abi.encode(
//                     params_.transferInfo.receiver,
//                     pendingAmount,
//                     params_.connector,
//                     execPayload
//                 );
//             } else {
//                 cacheData.identifierCache = abi.encode(
//                     params_.transferInfo.receiver,
//                     pendingAmount,
//                     params_.connector,
//                     bytes("")
//                 );
//             }

//             // emit TokensPending(
//             //     siblingChainSlug_,
//             //     receiver_,
//             //     pendingAmount,
//             //     pendingMints[siblingChainSlug_][receiver_][identifier],
//             //     identifier
//             // );
//         } else if (execPayload.length > 0) {
//             // execute
//             bool success = _execute(params_.transferInfo.receiver, execPayload);

//             if (success) cacheData.identifierCache = new bytes(0);
//             else {
//                 cacheData.identifierCache = abi.encode(
//                     params_.transferInfo.receiver,
//                     0,
//                     params_.connector,
//                     execPayload
//                 );
//             }

//             cacheData.connectorCache = connectorCache_;
//         }
//     }

//     /**
//      * @notice Handles pre-retry hook logic before execution.
//      * @dev This function can be used to mint funds which were in a pending state due to limits.
//      */
//     function preRetryHook(
//         uint32 siblingChainSlug_,
//         address connector_,
//         bytes memory identifierCache_,
//         bytes memory connectorCache_
//     )
//         external
//         isVaultOrToken
//         returns (
//             address updatedReceiver,
//             uint256 consumedAmount,
//             bytes memory postRetryHookData
//         )
//     {
//         (
//             address receiver,
//             uint256 pendingMint,
//             uint32 siblingChainSlug,
//             bytes memory execPayload
//         ) = abi.decode(identifierCache_, (address, uint256, uint32, bytes));
//         updatedReceiver = receiver;

//         if (siblingChainSlug != siblingChainSlug_)
//             revert InvalidSiblingChainSlug();

//         uint256 pendingAmount;
//         (consumedAmount, pendingAmount) = _consumePartLimit(
//             pendingMint,
//             _receivingLimitParams[connector_]
//         );

//         if (consumedAmount > totalIdle) {
//             _withdrawFromStrategy(consumedAmount - totalIdle);
//             totalIdle = 0;
//         } else totalIdle -= consumedAmount;

//         postRetryHookData = abi.encode(
//             updatedReceiver,
//             consumedAmount,
//             pendingAmount
//         );
//     }

//     /**
//      * @notice Handles post-retry hook logic after execution.
//      * @dev This function updates the identifier cache and sibling chain cache based on the post-hook data.
//      * @param siblingChainSlug_ The unique identifier of the sibling chain.
//      * @param identifierCache_ Identifier cache containing pending mint information.
//      * @param connectorCache_ Sibling chain cache containing pending amount information.
//      * @param postRetryHookData_ The post-hook data containing updated receiver and consumed/pending amounts.
//      * @return newIdentifierCache The updated identifier cache.
//      * @return newConnectorCache The updated sibling chain cache.
//      */
//     function postRetryHook(
//         uint32 siblingChainSlug_,
//         address connector_,
//         bytes memory identifierCache_,
//         bytes memory connectorCache_,
//         bytes memory postRetryHookData_
//     )
//         external
//         isVaultOrToken
//         returns (
//             bytes memory newIdentifierCache,
//             bytes memory newConnectorCache
//         )
//     {
//         (
//             ,
//             uint256 pendingMint,
//             uint32 siblingChainSlug,
//             bytes memory execPayload
//         ) = abi.decode(identifierCache_, (address, uint256, uint32, bytes));

//         (address receiver, uint256 consumedAmount, uint256 pendingAmount) = abi
//             .decode(postRetryHookData_, (address, uint256, uint256));

//         if (pendingAmount == 0 && receiver != address(0)) {
//             // receiver is not an input from user, can skip this check
//             // if (receiver_ != receiver) revert InvalidReceiver();

//             // no siblingChainSlug required here, as already done in preRetryHook call in same tx
//             // if (siblingChainSlug != siblingChainSlug_)
//             //     revert InvalidSiblingChainSlug();

//             // execute
//             bool success = _execute(receiver, execPayload);
//             if (success) newIdentifierCache = new bytes(0);
//             else
//                 newIdentifierCache = abi.encode(
//                     receiver,
//                     0,
//                     siblingChainSlug,
//                     execPayload
//                 );
//         }
//         uint256 connectorPendingAmount = abi.decode(connectorCache_, (uint256));
//         newConnectorCache = abi.encode(connectorPendingAmount - consumedAmount);
//     }

//     // todo: should this be moved out?
//     function syncToAppChain(
//         uint256 msgGasLimit_,
//         address connector_
//     ) external payable nonReentrant notShutdown {
//         _checkDelayAndRebalance();
//         uint256 expectedReturn = strategy.estimatedTotalAssets();

//         _depositToAppChain(
//             msgGasLimit_,
//             connector_,
//             abi.encode(address(0), 0, expectedReturn)
//         );
//     }

//     function _depositToAppChain(
//         uint256 msgGasLimit_,
//         address connector_,
//         bytes memory payload
//     ) internal {
//         IConnector(connector_).outbound{value: msg.value}(
//             msgGasLimit_,
//             payload
//         );
//     }

//     function getMinFees(
//         address connector_,
//         uint256 msgGasLimit_
//     ) external view returns (uint256 totalFees) {
//         return IConnector(connector_).getMinFees(msgGasLimit_);
//     }

//     function updateEmergencyShutdownState(
//         bool shutdownState_
//     ) external onlyOwner {
//         emergencyShutdown = shutdownState_;
//         emit ShutdownStateUpdated(shutdownState_);
//     }
// }
