pragma solidity 0.8.13;

import "./ControllerBase.sol";

contract SuperBridgeController is ControllerBase {
    uint256 public totalMinted;

    // connectorPoolId => totalLockedAmount
    mapping(uint256 => uint256) public poolLockedAmounts;

    // connector => connectorPoolId
    mapping(address => uint256) public connectorPoolIds;

    constructor(address token_, address hook_) ControllerBase(token_, hook_) {}

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
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_
    ) external payable nonReentrant {
        TransferInfo memory transferInfo = _beforeBridge(
            connector_,
            TransferInfo(receiver_, amount_, execPayload_)
        );
        // to maintain socket dl specific accounting for super token
        totalMinted -= transferInfo.amount;

        _burn(msg.sender, transferInfo.amount);

        uint256 connectorPoolId = connectorPoolIds[connector_];
        if (connectorPoolId == 0) revert InvalidPoolId();

        poolLockedAmounts[connectorPoolId] -= transferInfo.amount; // underflow revert expected

        _afterBridge(msgGasLimit_, connector_, options_, transferInfo);
    }

    function _burn(address user_, uint256 burnAmount_) internal virtual {
        token__.burn(user_, burnAmount_);
    }

    // receive inbound assuming connector called
    function receiveInbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external override nonReentrant {
        (
            address receiver,
            uint256 lockAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        // convert to shares
        TransferInfo memory transferInfo = TransferInfo(
            receiver,
            lockAmount,
            extraData
        );
        bytes memory postHookData;
        (transferInfo, postHookData) = _beforeMint(
            siblingChainSlug_,
            transferInfo
        );

        uint256 connectorPoolId = connectorPoolIds[msg.sender];
        if (connectorPoolId == 0) revert InvalidPoolId();

        poolLockedAmounts[connectorPoolId] += transferInfo.amount;
        token__.mint(transferInfo.receiver, transferInfo.amount);

        _afterMint(lockAmount, messageId, postHookData, transferInfo);
        emit TokensMinted(
            msg.sender,
            transferInfo.receiver,
            transferInfo.amount,
            messageId
        );
    }

    function retry(
        address connector_,
        bytes32 identifier_
    ) external nonReentrant {
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = _beforeRetry(connector_, identifier_);
        token__.mint(transferInfo.receiver, transferInfo.amount);

        _afterRetry(connector_, identifier_, postRetryHookData, cacheData);
    }
}
