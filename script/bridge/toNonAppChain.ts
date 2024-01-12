import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";

import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket } from "./utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  ChainAddresses,
  tokenDecimals,
} from "../../src";
import { getToken } from "../constants/config";

const srcChain = ChainSlug.LYRA_TESTNET;
const dstChain = ChainSlug.SEPOLIA;
const amount = "1";

let amountBN = utils.parseUnits(amount, tokenDecimals[getToken()]);
const gasLimit = 500_000;

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();

    const srcAddresses: ChainAddresses | undefined = addresses[srcChain];
    const dstAddresses: ChainAddresses | undefined = addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const addr: AppChainAddresses | undefined = srcAddresses[
      getToken()
    ] as AppChainAddresses;
    if (!addr) throw new Error("Token addresses not found");

    if (!addr.isAppChain) throw new Error("src should be app chain");

    const controllerAddr = addr.Controller;
    const tokenAddr = addr.MintableToken;
    const connectorAddr = addr.connectors?.[dstChain]?.FAST;

    if (!controllerAddr || !tokenAddr || !connectorAddr)
      throw new Error("Some contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    const controller: Contract = (
      await getInstance(SuperBridgeContracts.Controller, controllerAddr)
    ).connect(socketSigner);
    const tokenContract: Contract = (
      await getInstance("ERC20", tokenAddr)
    ).connect(socketSigner);

    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amountBN)) throw new Error("Not enough balance");

    const limit: BigNumber = await controller.getCurrentBurnLimit(
      connectorAddr
    );
    if (limit.lt(amountBN)) throw new Error("Exceeding max limit");

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      controller.address
    );
    if (currentApproval.lt(amountBN)) {
      const approveTx = await tokenContract.approve(
        controller.address,
        amountBN
      );
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    // deposit
    console.log(`withdrawing ${amountBN} from app chain to ${dstChain}`);

    const socket: Contract = getSocket(srcChain, socketSigner);
    const fees = await controller.getMinFees(connectorAddr, gasLimit);

    const withdrawTx = await controller.withdrawFromAppChain(
      socketSigner.address,
      amountBN,
      gasLimit,
      connectorAddr,
      { ...overrides[srcChain], value: fees }
    );
    console.log("Tokens burnt", withdrawTx.hash);
    console.log(
      `Track message here: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${withdrawTx.hash}`
    );
    await withdrawTx.wait();
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
