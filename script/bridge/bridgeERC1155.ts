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
    // const argv = await yargs
    //   .option({
    //     srcChain: {
    //       description: "srcChainSlug",
    //       type: "string",
    //       demandOption: true,
    //     },
    //   })
    //   .option({
    //     dstChain: {
    //       description: "dstChainSlug",
    //       type: "string",
    //       demandOption: true,
    //     },
    //   })
    //   .option({
    //     amount: {
    //       description: "token amount to bridge (formatted value)",
    //       type: "string",
    //       demandOption: true,
    //     },
    //   })
    //   .option({
    //     tokenId: {
    //       description: "tokenId",
    //       type: "string",
    //       demandOption: true,
    //     },
    //   })
    //   .option({
    //     token: {
    //       description: "token",
    //       type: "string",
    //       demandOption: true,
    //     },
    //   }).argv;

    const srcChain = 84532 as ChainSlug; //Number(argv.srcChain) as ChainSlug;
    const dstChain = 631571 as ChainSlug; //Number(argv.dstChain) as ChainSlug;
    const amount = 1;
    const token = "GOTCHI_ITEM" as Tokens;
    const tokenId = "151"; //argv.tokenId;

    // if (!Object.values(Tokens).includes(token))
    //   throw Error("token not allowed");

    const amountBN = utils.parseUnits(amount.toString(), tokenDecimals[token]);

    let addresses: SBAddresses | STAddresses | undefined =
      getProjectAddresses();

    console.log("addresses:", addresses);

    const srcAddresses: SBTokenAddresses | STTokenAddresses | undefined =
      addresses[srcChain]?.[token];

    console.log("srcAddresses:", srcAddresses);

    const dstAddresses: SBTokenAddresses | STTokenAddresses | undefined =
      addresses[dstChain]?.[token];

    console.log("dstAddresses:", dstAddresses);
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const bridgeContract = await getBridgeContract(
      srcChain,
      token,
      srcAddresses,
      "ERC1155"
    );
    const tokenContract = await getTokenContract(
      srcChain,
      token,
      srcAddresses,
      "ERC1155"
    );
    const connectorAddr = srcAddresses.connectors?.[dstChain]?.FAST;

    if (!connectorAddr) throw new Error("connector contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    console.log("checking balance and approval...");
    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address,
      tokenId
    );

    console.log("balance:", balance);

    // if (balance.lt(amountBN)) throw new Error("Not enough balance");

    const currentApproval: boolean = await tokenContract.isApprovedForAll(
      socketSigner.address,
      bridgeContract.address
    );
    if (!currentApproval) {
      const approveTx = await tokenContract.setApprovalForAll(
        bridgeContract.address,
        true,
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
    console.log(`depositing ${amount} to ${dstChain} from ${srcChain}`);
    const fees = await bridgeContract.getMinFees(connectorAddr, gasLimit, 0);

    // address receiver_,
    // address tokenOwner_,
    // uint256 tokenId_,
    // uint256 amount_,
    // uint256 msgGasLimit_,
    // address connector_,

    console.log("address:", socketSigner.address);

    const depositTx = await bridgeContract.bridge(
      "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
      "0xC3c2e1Cf099Bc6e1fA94ce358562BCbD5cc59FE5",
      tokenId,
      amount,
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
