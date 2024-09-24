import { BigNumber, utils } from "ethers";

import { ChainSlug } from "@socket.tech/dl-core";
import yargs from "yargs";
import {
  SBAddresses,
  SBTokenAddresses,
  STAddresses,
  STTokenAddresses,
} from "../../src";
import { Tokens, tokenDecimals } from "../../src/enums";
import { getProjectAddresses } from "../helpers";
import { getBridgeContract, getTokenContract } from "../helpers/common";
import { getOverrides, getSignerFromChainSlug } from "../helpers/networks";
import { checkSendingLimit, getDLAPIBaseUrl } from "./utils";

const gasLimit = 500_000;

export const main = async () => {
  try {
    const argv = await yargs
      .option({
        srcChain: {
          description: "srcChainSlug",
          type: "string",
          demandOption: true,
        },
      })
      .option({
        dstChain: {
          description: "dstChainSlug",
          type: "string",
          demandOption: true,
        },
      })
      .option({
        amount: {
          description: "token amount to bridge (formatted value)",
          type: "string",
          demandOption: true,
        },
      })
      .option({
        token: {
          description: "token",
          type: "string",
          demandOption: true,
        },
      }).argv;

    const srcChain = Number(argv.srcChain) as ChainSlug;
    const dstChain = Number(argv.dstChain) as ChainSlug;
    const amount = argv.amount;
    const token = argv.token as Tokens;

    if (!Object.values(Tokens).includes(token))
      throw Error("token not allowed");

    const amountBN = utils.parseUnits(amount.toString(), tokenDecimals[token]);

    let addresses: SBAddresses | STAddresses | undefined =
      getProjectAddresses();

    const srcAddresses: SBTokenAddresses | STTokenAddresses | undefined =
      addresses[srcChain]?.[token];
    const dstAddresses: SBTokenAddresses | STTokenAddresses | undefined =
      addresses[dstChain]?.[token];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const bridgeContract = await getBridgeContract(
      srcChain,
      token,
      srcAddresses
    );
    const tokenContract = await getTokenContract(srcChain, token, srcAddresses);
    const connectorAddr = srcAddresses.connectors?.[dstChain]?.FAST;

    if (!connectorAddr) throw new Error("connector contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    console.log("checking balance and approval...");
    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amountBN)) throw new Error("Not enough balance");

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      bridgeContract.address
    );
    if (currentApproval.lt(amountBN)) {
      const approveTx = await tokenContract.approve(
        bridgeContract.address,
        amountBN,
        {
          ...getOverrides(srcChain),
        }
      );
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    console.log("checking sending limit...");
    await checkSendingLimit(
      srcChain,
      token,
      srcAddresses,
      connectorAddr,
      amountBN
    );

    // deposit
    console.log(`depositing ${amountBN} to ${dstChain} from ${srcChain}`);
    const fees = await bridgeContract.getMinFees(connectorAddr, gasLimit, 0);

    const depositTx = await bridgeContract.bridge(
      socketSigner.address,
      amountBN,
      gasLimit,
      connectorAddr,
      "0x",
      "0x",
      { ...getOverrides(srcChain), value: fees }
    );
    console.log("Tokens deposited: ", depositTx.hash);
    console.log(
      `Track message here: ${getDLAPIBaseUrl()}/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${
        depositTx.hash
      }`
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
