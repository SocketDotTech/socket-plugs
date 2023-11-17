pragma solidity 0.8.13;

import "openzeppelin-contracts/contracts/access/Ownable2Step.sol";
import {RescueFundsLib} from "./RescueFundsLib.sol";

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

contract ExchangeRate is IExchangeRate, Ownable2Step {
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

    /**
     * @notice Rescues funds from the contract if they are locked by mistake.
     * @param token_ The address of the token contract.
     * @param rescueTo_ The address where rescued tokens need to be sent.
     * @param amount_ The amount of tokens to be rescued.
     */
    function rescueFunds(
        address token_,
        address rescueTo_,
        uint256 amount_
    ) external onlyOwner {
        RescueFundsLib.rescueFunds(token_, rescueTo_, amount_);
    }
}
