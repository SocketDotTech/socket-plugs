pragma solidity 0.8.13;

import "./plugins/LimitPlugin.sol";
import "../interfaces/IController.sol";
import "./plugins/ConnectorPoolPlugin.sol";
import "./LimitHook.sol";
import {IERC20} from "openzeppelin-contracts/contracts/token/erc20/IERC20.sol";
import "../interfaces/IBridge.sol";
import {IConnector} from "../interfaces/IConnector.sol";

interface LyraTSA is IERC20 {
    function underlying() external view returns (IERC20);

    function withdrawTo(
        address account,
        uint256 amount
    ) external returns (bool);

    function depositFor(
        address account,
        uint256 amount
    ) external returns (bool);
}

interface IBridgeExt is IBridge {
    function token() external view returns (address);
}

interface IConnectorPlugExt is IConnector {
    function bridge__() external returns (IBridge);
}

abstract contract LyraTSAHookBase is LimitHook {
    struct PackedAddresses {
        address returnRecipient;
        address fallbackReceiver;
        address withdrawConnector;
        IBridgeExt withdrawVault;
        IERC20 withdrawToken;
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

    ///////////
    // Admin //
    ///////////
    function setWithdrawalMinGasLimit(uint limit) external onlyOwner {
        withdrawalMinGasLimit = limit;
    }

    function recoverEth(address payable recipient) external onlyOwner {
        recipient.transfer(address(this).balance);
    }

    function recoverERC20(IERC20 token, address recipient) external onlyOwner {
        token.transfer(recipient, token.balanceOf(address(this)));
    }

    ////////////////
    // Hook calls //
    ////////////////

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

            if (
                returnRecipient == address(0) || withdrawConnector == address(0)
            ) {
                // In the case of an invalid/zero withdrawConnector still deposit to TSA and send to original receiver
                postHookData = abi.encode(consumedAmount, pendingAmount);
            } else {
                postHookData = abi.encode(
                    consumedAmount,
                    pendingAmount,
                    params_.transferInfo.receiver,
                    returnRecipient,
                    withdrawConnector
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
    )
        external
        override
        isVaultOrController
        returns (CacheData memory cacheData)
    {
        (
            uint256 consumedAmount,
            uint256 pendingAmount,
            PackedAddresses memory addrs,
            bool attemptToWithdraw
        ) = _parseParameters(params_);

        if (attemptToWithdraw) {
            IERC20 mintedToken = IERC20(IBridgeExt(vaultOrController).token());

            uint balance = mintedToken.balanceOf(address(this));
            if (balance != consumedAmount) {
                revert("MINTED_BALANCE_MISMATCH");
            }

            bool conversionSucceeded = _convertToken(
                mintedToken,
                addrs.withdrawToken,
                balance
            );

            if (conversionSucceeded) {
                bool withdrew = _withdrawToRecipient(addrs);
                if (!withdrew) {
                    // Withdraw failed, send withdrawToken to fallback
                    addrs.withdrawToken.transfer(
                        addrs.fallbackReceiver,
                        addrs.withdrawToken.balanceOf(address(this))
                    );
                }
            } else {
                // Deposit failed, send minted tokens to fallback
                mintedToken.transfer(addrs.fallbackReceiver, balance);
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

    function _parseParameters(
        DstPostHookCallParams memory params_
    )
        internal
        returns (
            uint256 consumedAmount,
            uint256 pendingAmount,
            PackedAddresses memory addrs,
            bool attemptToWithdraw
        )
    {
        attemptToWithdraw = false;

        if (params_.postHookData.length == 64) {
            (consumedAmount, pendingAmount) = abi.decode(
                params_.postHookData,
                (uint256, uint256)
            );
            return (consumedAmount, pendingAmount, addrs, false);
        } else if (params_.postHookData.length == 160) {
            // If the data is 160 bytes, it means we want to attempt to deposit to the TSA
            // and withdraw the shares immediately
            IERC20 mintedToken = IERC20(IBridgeExt(vaultOrController).token());
            (
                consumedAmount,
                pendingAmount,
                addrs.fallbackReceiver,
                addrs.returnRecipient,
                addrs.withdrawConnector
            ) = abi.decode(
                params_.postHookData,
                (uint256, uint256, address, address, address)
            );

            if (pendingAmount != 0) {
                revert("INVALID_PENDING_AMOUNT");
            }

            addrs.withdrawVault = tryGetWithdrawVault(addrs.withdrawConnector);
            if (address(addrs.withdrawVault) == address(0)) {
                mintedToken.transfer(addrs.fallbackReceiver, consumedAmount);
                return (consumedAmount, pendingAmount, addrs, false);
            }

            addrs.withdrawToken = tryGetToken(addrs.withdrawVault);
            if (address(addrs.withdrawToken) == address(0)) {
                mintedToken.transfer(addrs.fallbackReceiver, consumedAmount);
                return (consumedAmount, pendingAmount, addrs, false);
            }

            return (consumedAmount, pendingAmount, addrs, true);
        } else {
            revert("parse: INVALID_DATA_LENGTH");
        }
    }

    function _withdrawToRecipient(
        PackedAddresses memory addrs
    ) internal returns (bool success) {
        uint256 amount = addrs.withdrawToken.balanceOf(address(this));
        addrs.withdrawToken.approve(address(addrs.withdrawVault), amount);

        uint256 fees = IConnectorPlugExt(addrs.withdrawConnector).getMinFees(
            withdrawalMinGasLimit,
            0
        );

        if (fees > address(this).balance) {
            revert("INSUFFICIENT_ETH_BALANCE");
        }

        try
            addrs.withdrawVault.bridge{value: fees}(
                addrs.returnRecipient,
                amount,
                withdrawalMinGasLimit,
                addrs.withdrawConnector,
                new bytes(0),
                new bytes(0)
            )
        {
            return true;
        } catch {
            return false;
        }
    }

    /// @dev Returns zero address if bridge is not found or connector is invalid
    function tryGetWithdrawVault(
        address connector
    ) internal returns (IBridgeExt withdrawVault) {
        (bool success, bytes memory data) = connector.call(
            abi.encodeWithSignature("bridge__()")
        );

        if (!success || data.length == 0) {
            return IBridgeExt(address(0));
        }

        return IBridgeExt(abi.decode(data, (address)));
    }

    /// @dev Returns zero address if not found
    function tryGetToken(
        IBridgeExt withdrawVault
    ) internal returns (IERC20 withdrawToken) {
        (bool success, bytes memory data) = address(withdrawVault).call(
            abi.encodeWithSignature("token()")
        );
        if (!success || data.length == 0) {
            return IERC20(address(0));
        }
        return IERC20(abi.decode(data, (address)));
    }

    function _convertToken(
        IERC20 depositToken,
        IERC20 withdrawToken,
        uint256 amount
    ) internal virtual returns (bool success);
}

contract LyraTSADepositHook is LyraTSAHookBase {
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_
    ) LyraTSAHookBase(owner_, controller_, useControllerPools_) {}

    function _convertToken(
        IERC20 depositToken,
        IERC20 withdrawToken,
        uint256 amount
    ) internal override returns (bool success) {
        LyraTSA tsa = LyraTSA(address(withdrawToken));
        depositToken.approve(address(tsa), amount);
        try tsa.depositFor(address(this), amount) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }
}

contract LyraTSAWithdrawHook is LyraTSAHookBase {
    constructor(
        address owner_,
        address controller_,
        bool useControllerPools_
    ) LyraTSAHookBase(owner_, controller_, useControllerPools_) {}

    function _convertToken(
        IERC20 depositToken,
        IERC20 withdrawToken,
        uint256 amount
    ) internal override returns (bool success) {
        LyraTSA tsa = LyraTSA(address(depositToken));

        if (tsa.underlying() != withdrawToken) {
            return false;
        }

        try tsa.withdrawTo(address(this), amount) returns (bool) {
            return true;
        } catch {
            return false;
        }
    }
}
