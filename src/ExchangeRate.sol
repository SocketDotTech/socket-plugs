pragma solidity 0.8.13;

interface IExchangeRate {
    // not marked pure, may involve state interactions in future
    function getMintAmount(
        uint256 lockAmount,
        uint256 totalLockedAmount
    ) external returns (uint256 mintAmount);

    // not marked pure, may involve state interactions in future
    function getUnlockAmount(
        uint256 burnAmount,
        uint256 totalLockedAmount
    ) external returns (uint256 unlockAmount);
}

contract ExchangeRate is IExchangeRate {
    // chainId input needed? what else? slippage?
    function getMintAmount(
        uint256 lockAmount,
        uint256 /* totalLockedAmount */
    ) external pure returns (uint256 mintAmount) {
        return lockAmount;
    }

    function getUnlockAmount(
        uint256 burnAmount,
        uint256 /* totalLockedAmount */
    ) external pure returns (uint256 unlockAmount) {
        return burnAmount;
    }
}
