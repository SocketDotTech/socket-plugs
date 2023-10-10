import fs from "fs";
import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";
import { tokenDecimals, projectConstants } from "../helpers/constants";
import { CONTRACTS, ChainAddresses, AppChainAddresses } from "../helpers/types";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket } from "./utils";

const srcChain = ChainSlug.AEVO_TESTNET;
const dstChain = ChainSlug.ARBITRUM_GOERLI;
const gasLimit = 1000000;
let amount = utils.parseUnits(
  "10",
  tokenDecimals[projectConstants.tokenToBridge]
);

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();

    const srcAddresses: ChainAddresses | undefined = addresses[srcChain];
    const dstAddresses: ChainAddresses | undefined = addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const addr: AppChainAddresses | undefined = srcAddresses[
      projectConstants.tokenToBridge
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
      await getInstance(CONTRACTS.Controller, addr.Controller!)
    ).connect(socketSigner);
    const token: Contract = (
      await getInstance(CONTRACTS.MintableToken, addr.MintableToken!)
    ).connect(socketSigner);

    // approve
    const balance: BigNumber = await token.balanceOf(socketSigner.address);
    if (balance.lt(amount)) throw new Error("Not enough balance");

    const limit: BigNumber = await controller.getCurrentBurnLimit(
      addr.connectors?.[dstChain]?.FAST!
    );
    if (limit.lt(amount)) throw new Error("Exceeding max limit");

    const currentApproval: BigNumber = await token.allowance(
      socketSigner.address,
      controller.address
    );
    if (currentApproval.lt(amount)) {
      const approveTx = await token.approve(controller.address, amount);
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    // deposit
    console.log(`withdrawing ${amount} from app chain to ${dstChain}`);

    const socket: Contract = getSocket(srcChain, socketSigner);
    const value = await socket.getMinFees(
      gasLimit,
      100,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      dstChain,
      addr.connectors?.[dstChain]?.FAST!
    );

    const withdrawTx = await controller.withdrawFromAppChain(
      socketSigner.address,
      amount,
      gasLimit,
      addr.connectors?.[dstChain]?.FAST!,
      { ...overrides[srcChain], value }
    );
    console.log("Tokens burnt", withdrawTx.hash);
    console.log(
      `Track message here: https://6il289myzb.execute-api.us-east-1.amazonaws.com/dev/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${withdrawTx.hash}`
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
