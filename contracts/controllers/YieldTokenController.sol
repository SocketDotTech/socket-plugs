pragma solidity 0.8.13;

import "../Base.sol";

interface IYieldToken {
    function updateYield(uint256 amount_) external;

    function mint(address user_, uint256 amount_) external returns (uint256);

    function burn(address user_, uint256 amount_) external returns (uint256);

    function calculateMintAmount(uint256 amount_) external returns (uint256);

    function convertToShares(uint256 assets) external view returns (uint256);
}

contract YieldTokenController is Base {
    uint256 public totalMinted;

    constructor(address token_) Base(token_) {}

    // todo: limit check then convert

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
        // limits on shares
        TransferInfo memory transferInfo = _beforeBridge(
            connector_,
            TransferInfo(receiver_, amount_, execPayload_)
        );

        // to maintain socket dl specific accounting for super token
        // re check this logic for mint and mint use cases and if other minter involved
        totalMinted -= transferInfo.amount;

        uint256 asset = _burn(msg.sender, transferInfo.amount);
        bool pullFromStrategy = abi.decode(options_, (bool));
        _afterBridge(
            msgGasLimit_,
            connector_,
            abi.encode(pullFromStrategy, connector_, asset),
            transferInfo
        );
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

        TransferInfo memory transferInfo = TransferInfo(
            receiver,
            lockAmount,
            extraData
        );

        // pending will consider the yield at the time of receive inbound only even if i increase/decrease later
        bytes memory postHookData;
        (postHookData, transferInfo) = _beforeMint(
            siblingChainSlug_,
            transferInfo
        );

        _mint(transferInfo.receiver, transferInfo.amount);
        totalMinted += transferInfo.amount;

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
        IMintableERC20(token).mint(transferInfo.receiver, transferInfo.amount);
        totalMinted += transferInfo.amount;

        _afterRetry(connector_, messageId_, postRetryHookData);
    }

    function _burn(
        address user_,
        uint256 burnAmount_
    ) internal virtual returns (uint256 shares) {
        shares = IYieldToken(token).burn(user_, burnAmount_);
    }

    function _mint(address user_, uint256 mintAmount_) internal virtual {
        IYieldToken(token).mint(user_, mintAmount_);
    }
}
