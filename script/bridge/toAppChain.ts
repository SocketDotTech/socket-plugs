import fs from "fs";
import { Contract, Transaction, Wallet, utils } from "ethers";

import { getProviderFromChainSlug, overrides } from "../helpers/networks";
import { deployedAddressPath, getInstance } from "../helpers/utils";
import { mode } from "../helpers/constants";
import { CONTRACTS, Common, DeploymentAddresses } from "../helpers/types";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket } from "./utils";

const srcChain = ChainSlug.ARBITRUM_GOERLI;
const dstChain = ChainSlug.AEVO_TESTNET;
const amount = 10 // utils.parseUnits("1", "ether");
const gasLimit = 1000000;

export const main = async () => {
  try {
    if (!fs.existsSync(deployedAddressPath(mode))) {
      throw new Error("addresses.json not found");
    }
    let addresses: DeploymentAddresses = JSON.parse(
      fs.readFileSync(deployedAddressPath(mode), "utf-8")
    );

    if (!addresses[srcChain] || !addresses[dstChain]) return;
    let addr: Common = addresses[srcChain]!;

    const providerInstance = getProviderFromChainSlug(srcChain);
    const socketSigner: Wallet = new Wallet(
      process.env.PRIVATE_KEY as string,
      providerInstance
    );

    if (!addr.Vault || !addr.NonMintableToken || !addr.connectors?.[dstChain]?.FAST) return;

    const vault: Contract = (await getInstance(CONTRACTS.Vault, addr.Vault!)).connect(socketSigner);
    const token: Contract = (await getInstance(CONTRACTS.NonMintableToken, addr.NonMintableToken!)).connect(socketSigner);

    // approve
    const approveTx = await token.approve(vault.address, amount);
    console.log(approveTx.hash);
    await approveTx.wait();

    // deposit
    const socket: Contract = getSocket(srcChain, socketSigner);
    const value = await socket.getMinFees(
      gasLimit,
      100,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      dstChain,
      addr.connectors?.[dstChain]?.FAST!
    );

    const depositTx = await vault.depositToAppChain(
      socketSigner.address,
      amount,
      gasLimit,
      addr.connectors?.[dstChain]?.FAST!,
      { ...overrides[srcChain], value }
    );
    console.log(depositTx.hash);
    await depositTx.wait();

    console.log(`Sent bridge tx from ${srcChain} to ${dstChain}`);
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
