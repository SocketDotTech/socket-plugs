pragma solidity 0.8.13;

import "./plugins/LimitPlugin.sol";
import "../interfaces/IController.sol";
import "./plugins/ConnectorPoolPlugin.sol";
import "./LimitHook.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/erc20/IERC20.sol";
import "../interfaces/IBridge.sol";
import {IConnector} from "../interfaces/IConnector.sol";


interface LyraTSA is IERC20 {
    function depositFor(address account, uint256 amount) external returns (bool);
}

interface IBridgeExt is IBridge {
    function token() external view returns (address);
}

interface IConnectorPlugExt is IConnector {
    function bridge__() external returns (IBridge);
}


contract LyraTSAZapHook is LimitHook {
    struct ZapAddresses {
        address returnRecipient;
        address fallbackReceiver;
        address withdrawConnector;
        IBridgeExt withdrawVault;
        LyraTSA tsa;
    }

    uint withdrawalMinGasLimit = 500000;

    /**
     * @notice Constructor for creating a new SuperToken.
     * @param owner_ Owner of this contract.
     */
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_
    ) LimitHook(owner_, controller_, useControllerPools_) {
        hookType = LYRA_VAULT_ZAP_HOOK;
    }

    receive() external payable {}

    function setWithdrawalMinGasLimit(uint limit) external onlyOwner {
        withdrawalMinGasLimit = limit;
    }

    function recoverEth(address payable recipient) external onlyOwner {
        recipient.transfer(address(this).balance);
    }

    function dstPreHookCall(
        DstPreHookCallParams memory params_
    )
        external
        override
        isVaultOrController
        returns (bytes memory postHookData, TransferInfo memory transferInfo)
    {
        if (useControllerPools)
            _poolDstHook(params_.connector, params_.transferInfo.amount);

        (uint256 consumedAmount, uint256 pendingAmount) = _limitDstHook(
            params_.connector,
            params_.transferInfo.amount
        );
        transferInfo = params_.transferInfo;
        transferInfo.amount = consumedAmount;

        // No data provided, process normally OR if not all amount is consumed, process normally
        if (params_.transferInfo.data.length == 64 && pendingAmount == 0) {
            (address returnRecipient, address withdrawConnector) = abi.decode(
                params_.transferInfo.data,
                (address, address)
            );

            if (returnRecipient == address(0) || withdrawConnector == address(0)) {
                // In the case of an invalid/zero withdrawConnector still deposit to TSA and send to original receiver
                postHookData = abi.encode(consumedAmount, pendingAmount);
            } else {
                postHookData = abi.encode(
                    consumedAmount, pendingAmount, params_.transferInfo.receiver, returnRecipient, withdrawConnector
                );
                transferInfo.receiver = address(this);
            }
        } else {
            // Any invalid data shape will be treated as a normal transfer
            postHookData = abi.encode(consumedAmount, pendingAmount);
        }
    }

    function dstPostHookCall(
        DstPostHookCallParams memory params_
    ) external override isVaultOrController returns (CacheData memory cacheData) {
        (
            uint256 consumedAmount,
            uint256 pendingAmount,
            ZapAddresses memory zapAddresses,
            bool attemptToWithdraw
        ) = _parseParameters(params_);

        if (attemptToWithdraw) {
            IERC20 mintedToken = IERC20(IBridgeExt(vaultOrController).token());

            uint balance = mintedToken.balanceOf(address(this));
            if (balance != consumedAmount) {
                revert("MINTED_BALANCE_MISMATCH");
            }

            bool deposited = _depositToTSA(zapAddresses.tsa, mintedToken, balance);
            if (deposited) {
                bool withdrew = _withdrawToRecipient(
                    zapAddresses
                );
                if (!withdrew) {
                    // Withdraw failed, send tsa shares to fallback
                    zapAddresses.tsa.transfer(zapAddresses.fallbackReceiver, zapAddresses.tsa.balanceOf(address(this)));
                }
            } else {
                // Deposit failed, send minted tokens to fallback
                mintedToken.transfer(zapAddresses.fallbackReceiver, balance);
            }
        }

        uint256 connectorPendingAmount = _getConnectorPendingAmount(
            params_.connectorCache
        );
        if (pendingAmount > 0) {
            cacheData = CacheData(
                abi.encode(
                    params_.transferInfo.receiver,
                    pendingAmount,
                    params_.connector
                ),
                abi.encode(connectorPendingAmount + pendingAmount)
            );

            emit TokensPending(
                params_.connector,
                params_.transferInfo.receiver,
                consumedAmount,
                pendingAmount,
                params_.messageId
            );
        } else {
            cacheData = CacheData(
                bytes(""),
                abi.encode(connectorPendingAmount + pendingAmount)
            );
        }
    }

    function _parseParameters(DstPostHookCallParams memory params_) internal returns (
        uint256 consumedAmount,
        uint256 pendingAmount,
        ZapAddresses memory zapAddresses,
        bool attemptToWithdraw
    ) {
        attemptToWithdraw = false;

        if (params_.postHookData.length == 64) {
            (consumedAmount, pendingAmount) = abi.decode(
                params_.postHookData,
                (uint256, uint256)
            );
            return (consumedAmount, pendingAmount, zapAddresses, false);
        } else if (params_.postHookData.length == 160) {
            IERC20 mintedToken = IERC20(IBridgeExt(vaultOrController).token());

            // If the data is 320 bytes, it means we want to attempt to deposit to the TSA and withdraw immediately

            (consumedAmount, pendingAmount, zapAddresses.fallbackReceiver, zapAddresses.returnRecipient, zapAddresses.withdrawConnector) = abi.decode(
                params_.postHookData,
                (uint256, uint256, address, address, address)
            );

            if (pendingAmount != 0) {
                revert("INVALID_PENDING_AMOUNT");
            }

            zapAddresses.withdrawVault = tryGetWithdrawVault(zapAddresses.withdrawConnector);
            if (address(zapAddresses.withdrawVault) == address(0)) {
                mintedToken.transfer(zapAddresses.fallbackReceiver, consumedAmount);
                return (consumedAmount, pendingAmount, zapAddresses, false);
            }

            zapAddresses.tsa = tryGetTSA(zapAddresses.withdrawVault);
            if (address(zapAddresses.tsa) == address(0)) {
                mintedToken.transfer(zapAddresses.fallbackReceiver, consumedAmount);
                return (consumedAmount, pendingAmount, zapAddresses, false);
            }

            attemptToWithdraw = address(zapAddresses.tsa) != address(0);

            return (consumedAmount, pendingAmount, zapAddresses, attemptToWithdraw);

        } else {
            revert("parse: INVALID_DATA_LENGTH");
        }
    }

    function _depositToTSA(
        LyraTSA tsa,
        IERC20 token,
        uint256 amount
    ) internal returns (bool success) {
        token.approve(address(tsa), amount);
        try tsa.depositFor(address(this), amount) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }

    function _withdrawToRecipient(
        ZapAddresses memory zapAddresses
    ) internal returns (bool success) {
        uint256 amount = zapAddresses.tsa.balanceOf(address(this));
        zapAddresses.tsa.approve(address(zapAddresses.withdrawVault), amount);

        uint256 fees = IConnectorPlugExt(zapAddresses.withdrawConnector).getMinFees(withdrawalMinGasLimit, 0);

        if (fees > address(this).balance) {
            revert("INSUFFICIENT_ETH_BALANCE");
        }

        try zapAddresses.withdrawVault.bridge{value: fees}(
            zapAddresses.returnRecipient,
            amount,
            withdrawalMinGasLimit,
            zapAddresses.withdrawConnector,
            new bytes(0),
            new bytes(0)
        ) {
            return true;
        } catch {
            return false;
        }
    }

    /// @dev Returns zero address if bridge is not found or connector is invalid
    function tryGetWithdrawVault(address connector) internal returns (IBridgeExt withdrawVault) {
        (bool success, bytes memory data) = connector.call(abi.encodeWithSignature("bridge__()"));

        if (!success || data.length == 0) {
            return IBridgeExt(address(0));
        }

        return IBridgeExt(address(IConnectorPlugExt(connector).bridge__()));
    }

    /// @dev Returns zero address if TSA is not found
    function tryGetTSA(IBridgeExt withdrawVault) internal returns (LyraTSA tsa) {
        (bool success, bytes memory data) = address(withdrawVault).call(abi.encodeWithSignature("token()"));
        if (!success || data.length == 0) {
            return LyraTSA(address(0));
        }
        return LyraTSA(withdrawVault.token());
    }
}
