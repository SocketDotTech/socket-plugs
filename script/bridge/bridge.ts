import { BigNumber, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getSuperBridgeAddresses, getSuperTokenAddresses } from "../helpers";
import { ChainSlug, ChainSlugToKey } from "@socket.tech/dl-core";
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
import {
  handleOps,
  isKinto,
} from "@socket.tech/dl-core/dist/scripts/deploy/utils/kinto/kinto";
import constants from "@socket.tech/dl-core/dist/scripts/deploy/utils/kinto/constants.json";

const srcChain = ChainSlug.KINTO;
const dstChain = ChainSlug.BASE;
// const srcChain = ChainSlug.KINTO;
// const dstChain = ChainSlug.ARBITRUM_SEPOLIA;
// const amount = "0";
const amount = "0.1";
const MESSAGE_ID: string = ""; // use if you want to retry a message
const gasLimit = 500_000;

export const main = async () => {
  // retrying message
  if (MESSAGE_ID && MESSAGE_ID.length > 0) {
    await retry();
    return;
  }

  try {
    let senderSigner = getSignerFromChainSlug(srcChain);

    const sender = isKinto(srcChain)
      ? process.env.KINTO_OWNER_ADDRESS
      : senderSigner.address;
    const receiver = isKinto(dstChain)
      ? process.env.KINTO_OWNER_ADDRESS
      : senderSigner.address;

    const tokens = getTokens();
    if (tokens.length > 1) throw Error("single token bridge allowed");
    const token = tokens[0];

    console.log(
      `Bridging ${amount} ${token} from ${ChainSlugToKey[srcChain]} to ${ChainSlugToKey[dstChain]}, from ${sender} to ${receiver}...`
    );

    const amountBN = utils.parseUnits(amount, tokenDecimals[token]);

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
      srcAddresses,
      senderSigner
    );
    const tokenContract = await getTokenContract(
      srcChain,
      token,
      srcAddresses,
      senderSigner
    );
    const connectorAddr = srcAddresses.connectors?.[dstChain]?.FAST;

    if (!connectorAddr) throw new Error("connector contract addresses missing");

    console.log(
      `Checking ${sender}'s ${token} balance on chain ${srcChain} and approval...`
    );

    const balance: BigNumber = await tokenContract.balanceOf(sender);
    console.log(
      `${token} balance: ${utils.formatUnits(
        balance,
        await tokenContract.decimals()
      )}`
    );
    if (balance.lt(amountBN)) throw new Error("Not enough balance");

    // approve
    const currentApproval: BigNumber = await tokenContract.allowance(
      senderSigner.address,
      bridgeContract.address
    );
    if (currentApproval.lt(amountBN)) {
      console.log(`Approving contract to spend ${amount} ${token} ...`);
      let tx;
      const args = [bridgeContract.address, amountBN];
      let txRequest = await tokenContract.populateTransaction["approve"](
        ...args,
        {
          ...overrides[srcChain],
        }
      );

      if (isKinto(srcChain)) {
        tx = await handleOps(
          process.env.KINTO_OWNER_ADDRESS,
          [txRequest],
          [`0x${process.env.OWNER_SIGNER_KEY}`, constants.TREZOR]
        );
      } else {
        tx = await (
          await tokenContract.signer.sendTransaction(txRequest)
        ).wait();
      }

      console.log("Tokens approved: ", tx.transactionHash);
    }

    console.log("Checking sending limit...");
    await checkSendingLimit(
      srcChain,
      token,
      srcAddresses,
      connectorAddr,
      amountBN
    );

    // deposit
    let fees = await bridgeContract.getMinFees(connectorAddr, gasLimit, 0);
    console.log(`Fees: ${utils.formatUnits(fees, 18)} ETH`);

    console.log(
      `Bridging ${amount} ${token} from ${ChainSlugToKey[srcChain]} to ${ChainSlugToKey[dstChain]}`
    );

    let tx;
    const args = [receiver, amountBN, gasLimit, connectorAddr, "0x", "0x"];
    let txRequest = await bridgeContract.populateTransaction["bridge"](
      ...args,
      {
        ...overrides[srcChain],
        value: fees,
      }
    );

    if (isKinto(srcChain)) {
      tx = await handleOps(
        process.env.KINTO_OWNER_ADDRESS,
        [txRequest],
        [`0x${process.env.OWNER_SIGNER_KEY}`, constants.TREZOR],
        fees
      );
    } else {
      tx = await (await tokenContract.signer.sendTransaction(txRequest)).wait();
    }

    console.log("Tokens deposited: ", tx.transactionHash);
    console.log(
      `Track message here: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${tx.transactionHash}`
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

export const retry = async () => {
  const signer = getSignerFromChainSlug(ChainSlug.KINTO);
  const srcChain = ChainSlug.KINTO;
  const dstChain = ChainSlug.ARBITRUM_SEPOLIA;

  console.log(
    `Retrying message ${MESSAGE_ID} on ${ChainSlugToKey[srcChain]}...`
  );

  const tokens = getTokens();
  if (tokens.length > 1) throw Error("single token bridge allowed");
  const token = tokens[0];

  const addresses = getSuperBridgeAddresses() as SBAddresses;
  const srcAddresses: SBTokenAddresses | STTokenAddresses | undefined =
    addresses[srcChain]?.[token];
  if (!srcAddresses) throw new Error("chain addresses not found");

  const connectorAddr = srcAddresses.connectors?.[dstChain]?.FAST;
  const bridgeContract = await getBridgeContract(
    srcChain,
    token,
    srcAddresses,
    signer
  );

  const args = [connectorAddr, MESSAGE_ID];
  let txRequest = await bridgeContract.populateTransaction["retry"](...args, {
    ...overrides[srcChain],
  });

  const tx = await handleOps(
    process.env.KINTO_OWNER_ADDRESS,
    [txRequest],
    [`0x${process.env.OWNER_SIGNER_KEY}`, constants.LEDGER]
  );

  console.log("Retrial hash: ", tx.transactionHash);
  console.log(
    `Track message here: https://prod.dlapi.socket.tech/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${tx.transactionHash}`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
