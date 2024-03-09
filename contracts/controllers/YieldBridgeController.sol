pragma solidity 0.8.13;

// import {IExchangeRate} from "./ExchangeRate.sol";
// import {IMintableERC20} from "./IMintableERC20.sol";
// import "solmate/utils/SafeTransferLib.sol";
// import "./ControllerBase.sol";
// import "../interfaces/IHook.sol";

// contract SuperBridgeController is ControllerBase {
//     IMintableERC20 public immutable token__;
//     uint256 public totalMinted;

//     constructor(
//         address token_,
//         address hook_
//     ) ControllerBase(token_, exchangeRate_, hook_) {}

//     // limits on assets or shares?
//     function bridge(
//         address receiver_,
//         uint256 amount_,
//         uint256 msgGasLimit_,
//         address connector_,
//         bytes calldata execPayload_,
//         bytes calldata options_
//     ) external payable nonReentrant {
//         (
//             address finalReceiver,
//             uint256 finalAmount,
//             bytes memory extraData
//         ) = _beforeBridge(receiver_, amount_, connector_, execPayload_);

//         _burn(msg.sender, finalAmount);

//         _afterBridge(
//             finalReceiver,
//             finalAmount,
//             msgGasLimit_,
//             connector_,
//             extraData,
//             options_
//         );
//     }

//     function _burn(address user_, uint256 burnAmount_) internal virtual {
//         token__.burn(user_, burnAmount_);
//     }

//     // receive inbound assuming connector called
//     function receiveInbound(
//         bytes memory payload_
//     ) external override nonReentrant {
//         (
//             address finalReceiver,
//             uint256 finalAmount,
//             uint256 lockAmount,
//             bytes memory extraData
//         ) = _beforeMint(payload_);

//         token__.mint(receiver, finalAmount);

//         _afterMint(finalReceiver, lockAmount, );
//         emit TokensMinted(msg.sender, finalReceiver, finalAmount, messageId);
//     }

//     function retry(
//         address connector_,
//         bytes32 identifier_
//     ) external nonReentrant {
//         _beforeRetry(connector_, identifier_);
//         token__.mint(receiver, consumedAmount);

//         _afterRetry(
//                 connector_,
//                 cacheData,
//                 postRetryHookData,
//                 identifier_
//             );
//     }

// }
