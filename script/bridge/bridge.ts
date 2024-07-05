import { BigNumber, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getSuperBridgeAddresses, getSuperTokenAddresses } from "../helpers";
import { ChainSlug } from "@socket.tech/dl-core";
import {
  SBAddresses,
  STAddresses,
  STTokenAddresses,
  SBTokenAddresses,
} from "../../src";
import { getTokens, isSuperBridge, isSuperToken } from "../constants/config";
import { checkSendingLimit } from "./utils";
import { getBridgeContract, getTokenContract } from "../helpers/common";
import { tokenDecimals } from "../../src/enums";

const srcChain = ChainSlug.ARBITRUM;
const dstChain = ChainSlug.OPTIMISM;
const gasLimit = 500_000;
// without decimals
const amount = 1;

export const main = async () => {
  try {
    const tokens = getTokens();
    if (tokens.length > 1) throw Error("single token bridge allowed");
    const token = tokens[0];

    const amountBN = utils.parseUnits(amount.toString(), tokenDecimals[token]);

    let addresses: SBAddresses | STAddresses | undefined = {};
    if (isSuperBridge()) {
      addresses = getSuperBridgeAddresses() as SBAddresses;
    } else if (isSuperToken()) {
      addresses = getSuperTokenAddresses() as STAddresses;
    }

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
          ...overrides[srcChain],
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
