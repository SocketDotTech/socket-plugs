import { BigNumber, utils } from "ethers";

import {
  getProviderFromChainSlug,
  getSignerFromChainSlug,
  overrides,
} from "../helpers/networks";
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
  setFunderWhitelist,
} from "@socket.tech/dl-core/dist/scripts/deploy/utils/kinto/kinto";
import constants from "@socket.tech/dl-core/dist/scripts/deploy/utils/kinto/constants.json";
import { ethers } from "hardhat";

const srcChain = ChainSlug.KINTO;
const dstChain = ChainSlug.MAINNET;
// const srcChain = ChainSlug.KINTO;
// const dstChain = ChainSlug.ARBITRUM_SEPOLIA;
// const amount = "0";
const amount = "0.1";
const RANDOM_EOA = "0x0A3A32884D3f1175D49C8DD9f67B0bc552A81362";
const MESSAGE_ID: string = ""; // use if you want to retry a message
const gasLimit = 500_000;

// Bridge from Arbitrum -> Kinto when
// 1. from is signer of kinto wallet to signer's kinto wallet (should work) ✅
// 2. from is whitelisted address (should work) ✅
// 3. from is non whitelisted address (should revert and trigger withdrawal) ✅
// 4. from is a non kinto wallet (should revert and trigger withdrawal) ✅

// Bridge from Kinto -> Arbitrum when
// 5. to is signer of kinto wallet (should work) ✅
// 6. to is whitelisted address (should work) ✅
// 7. to is non-whitelisted address (should revert) (should revert) ✅ (maybe remove this check?)
// 8. from is non KYC'd address (should revert)
// 9. from is a non kinto wallet (should revert but I think this is not even possible)

// Retrial scenarios
// Bridge from Arbitrum -> Kinto when
// 1. Kinto checks OK but receiving limit is 0 (should succeed but not mint tokens) ✅
// 1.0 [DO NOT INCREASE RECEIVING LIMIT] Kinto checks OK + call `retry` on Kinto Controller (should succeed but not mint tokens) ✅
// 1.1 [INCREASE RECEIVING LIMIT] Kinto checks OK + call `retry` on Kinto Controller (should mint tokens) ✅
// 1.2 [INCREASE RECEIVING LIMIT + MAKE KINTO CHECK FAIL] Kinto checks NOTOK but + call `retry` on Kinto Controller (❓)
// Should this scenario trigger a withdrawal or let it complete?

// TODO: test all with sending the fees
// TODO: test this scenario:
// Bridge from Arb to Kinto
// Then, re-deploy hooks
// Finally, try bridging back from Kinto to Arbitrum
// Check if it works
// if you redeploy the hook, you will have to call the updatePoolLocked amount function so that it matches the value on old hook and then all will be good

export const main = async () => {
  // retrying message
  if (MESSAGE_ID && MESSAGE_ID.length > 0) {
    await retry();
    return;
  }

  try {
    let senderSigner = getSignerFromChainSlug(srcChain);

    // if there's a funder private key, use that as the sender
    // sender must be whitelisted on Kinto Wallet of receiver
    // const senderPrivateKey = process.env.FUNDER_PRIVATE_KEY;
    // if (senderPrivateKey) {
    //   senderSigner = new ethers.Wallet(
    //     senderPrivateKey,
    //     getProviderFromChainSlug(srcChain)
    //   );
    //   const kintoSigner = getSignerFromChainSlug(ChainSlug.KINTO);
    //   await setFunderWhitelist([senderSigner.address], [false], kintoSigner);
    // }

    const sender = isKinto(srcChain)
      ? process.env.KINTO_OWNER_ADDRESS
      : senderSigner.address;
    const receiver = isKinto(dstChain)
      ? process.env.KINTO_OWNER_ADDRESS
      : senderSigner.address;

    // whitelist random EOA as receiver on vaults
    // const receiver = RANDOM_EOA;
    // const kintoSigner = getSignerFromChainSlug(ChainSlug.KINTO);
    // await setFunderWhitelist([RANDOM_EOA], [true], kintoSigner);

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
        tx = await handleOps([txRequest], tokenContract.signer);
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
      tx = await handleOps([txRequest], tokenContract.signer, fees);
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

  const tx = await handleOps([txRequest], signer);

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
