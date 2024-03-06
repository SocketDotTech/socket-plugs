pragma solidity 0.8.13;

import {IExchangeRate} from "./ExchangeRate.sol";
import {IMintableERC20} from "./IMintableERC20.sol";
import "solmate/utils/SafeTransferLib.sol";
import "./ControllerBase.sol";
import "../interfaces/IHook.sol";

contract SuperBridgeController is ControllerBase {
    IMintableERC20 public immutable token__;

    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    uint256 public totalMinted;

    constructor(
        address token_,
        address hook_
    ) ControllerBase(token_, exchangeRate_, hook_) {}

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

    // limits on assets or shares?
    // limits on assets or shares?
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_
    ) external payable nonReentrant {
        (
            address finalReceiver,
            uint256 finalAmount,
            bytes memory extraData
        ) = _beforeBridge(receiver_, amount_, connector_, execPayload_);

        _burn(msg.sender, finalAmount);

        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();

        poolLockedAmounts[connectorPoolId] -= finalAmount; // underflow revert expected

        _afterBridge(
            finalReceiver,
            finalAmount,
            msgGasLimit_,
            connector_,
            extraData,
            options_
        );
    }

    function _burn(address user_, uint256 burnAmount_) internal virtual {
        token__.burn(user_, burnAmount_);
    }

    // receive inbound assuming connector called
    function receiveInbound(
        bytes memory payload_
    ) external override nonReentrant {
        (
            address finalReceiver,
            uint256 finalAmount,
            uint256 lockAmount,
            bytes memory extraData
        ) = _beforeMint(payload_);

        uint256 connectorPoolId = connectorPoolIds[msg.sender];
        if (connectorPoolId == 0) revert InvalidPoolId();

        poolLockedAmounts[connectorPoolId] += finalAmount;
        token__.mint(receiver, finalAmount);

        _afterMint(finalReceiver, lockAmount, );
        emit TokensMinted(msg.sender, finalReceiver, finalAmount, messageId);
    }

    function retry(
        address connector_,
        bytes32 identifier_
    ) external nonReentrant {
        _beforeRetry(connector_, identifier_);
        token__.mint(receiver, consumedAmount);

        _afterRetry(
                connector_,
                cacheData,
                postRetryHookData,
                identifier_    
            );
    }

}
