import { BigNumber, Contract, Wallet, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";
import { ChainSlug } from "@socket.tech/dl-core";
import {
  SuperBridgeContracts,
  ChainAddresses,
  NonAppChainAddresses,
  tokenDecimals,
} from "../../src";
import { getToken } from "../constants/config";
import { checkSendingLimit } from "./common";

const srcChain = ChainSlug.OPTIMISM_SEPOLIA;
const dstChain = ChainSlug.AEVO_TESTNET;
const amount = "0";
// const amount = "1";

const gasLimit = 500_000;
const amountBN = utils.parseUnits(amount, tokenDecimals[getToken()]);

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    const srcAddresses: ChainAddresses | undefined = addresses[srcChain];
    const dstAddresses: ChainAddresses | undefined = addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const addr: NonAppChainAddresses | undefined = srcAddresses[
      getToken()
    ] as NonAppChainAddresses;
    if (!addr) throw new Error("Token addresses not found");

    if (addr.isAppChain) throw new Error("src should not be app chain");

    const vaultAddr = addr.Vault;
    const tokenAddr = addr.NonMintableToken;
    const connectorAddr = addr.connectors?.[dstChain]?.FAST;

    if (!vaultAddr || !tokenAddr || !connectorAddr)
      throw new Error("Some contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    const vault: Contract = (
      await getInstance(SuperBridgeContracts.Vault, vaultAddr)
    ).connect(socketSigner);
    const tokenContract: Contract = (
      await getInstance("ERC20", tokenAddr)
    ).connect(socketSigner);

    console.log("checking balance and approval...");
    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amountBN)) throw new Error("Not enough balance");

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      vault.address
    );
    if (currentApproval.lt(amountBN)) {
      const approveTx = await tokenContract.approve(vault.address, amountBN, {
        ...overrides[srcChain],
      });
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    console.log("checking sending limit...");
    await checkSendingLimit(addr, connectorAddr, amountBN, socketSigner);

    // deposit
    console.log(`depositing ${amountBN} to app chain from ${srcChain}`);

    const fees = await vault.getMinFees(connectorAddr, gasLimit, 0);

    const depositTx = await vault.bridge(
      socketSigner.address,
      amountBN,
      gasLimit,
      connectorAddr,
      "0x",
      "0x",
      { ...overrides[srcChain], value: fees }
    );
    console.log("Tokens deposited: ", depositTx.hash);
    console.log(
      `Track message here: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${depositTx.hash}`
    );
    await depositTx.wait();
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
