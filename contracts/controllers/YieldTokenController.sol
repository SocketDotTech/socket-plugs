pragma solidity 0.8.13;

import "../Base.sol";

contract YieldTokenController is Base {
    uint256 public totalMinted;

    // connector => total yield
    mapping(address => uint256) public siblingTotalYield;

    constructor(address token_, address hook_) Base(token_, hook_) {}

    // limits on shares here
    // options_ here is now a boolean which indicates if we want to enable withdrawing
    // from strategy
    function bridge(
        address receiver_,
        uint256 amount_,
        uint256 msgGasLimit_,
        address connector_,
        bytes calldata execPayload_,
        bytes calldata options_
    ) external payable nonReentrant {
        if (amount_ > siblingTotalYield[connector_]) revert InsufficientFunds();

        // limits on shares
        TransferInfo memory transferInfo = _beforeBridge(
            connector_,
            TransferInfo(receiver_, amount_, execPayload_)
        );

        // to maintain socket dl specific accounting for super token
        // re check this logic for mint and mint use cases and if other minter involved
        totalMinted -= transferInfo.amount;
        siblingTotalYield[connector_] -= amount_;
        uint256 shares = _burn(msg.sender, transferInfo.amount);

        _afterBridge(msgGasLimit_, connector_, options_, transferInfo);
    }

    // receive inbound assuming connector called
    function receiveInbound(
        uint32 siblingChainSlug_,
        bytes memory payload_
    ) external payable override nonReentrant {
        (
            address receiver,
            uint256 lockAmount,
            bytes32 messageId,
            bytes memory extraData
        ) = abi.decode(payload_, (address, uint256, bytes32, bytes));

        (uint256 newYield, ) = abi.decode(extraData, (uint256, bytes));

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

        siblingTotalYield[msg.sender] += transferInfo.amount;
        _mint(transferInfo.receiver, transferInfo.amount);
        token__.updateYield(newYield);

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
        bytes32 messageId_
    ) external nonReentrant {
        (
            bytes memory postRetryHookData,
            TransferInfo memory transferInfo
        ) = _beforeRetry(connector_, messageId_);

        totalMinted += transferInfo.amount;
        // todo: check
        siblingTotalYield[connector_] += transferInfo.amount;
        _mint(transferInfo.receiver, transferInfo.amount);

        _afterRetry(connector_, messageId_, postRetryHookData);
    }

    function _burn(
        address user_,
        uint256 burnAmount_
    ) internal virtual returns (uint256 shares) {
        shares = token__.burn(user_, burnAmount_);
    }

    function _mint(
        address user_,
        uint256 mintAmount_
    ) internal virtual returns (uint256 shares) {
        shares = token__.mint(user_, mintAmount_);
    }
}
