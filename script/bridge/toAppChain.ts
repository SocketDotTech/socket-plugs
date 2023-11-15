import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";
import { projectConstants, tokenDecimals } from "../helpers/constants";
import {
  CONTRACTS,
  ChainAddresses,
  NonAppChainAddresses,
} from "../helpers/types";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket } from "./utils";

const srcChain = ChainSlug.SEPOLIA;
const dstChain = ChainSlug.LYRA_TESTNET;
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

    const addr: NonAppChainAddresses | undefined = srcAddresses[
      projectConstants.tokenToBridge
    ] as NonAppChainAddresses;
    if (!addr) throw new Error("Token addresses not found");

    if (addr.isAppChain) throw new Error("src should not be app chain");

    const vaultAddr = addr.Vault;
    const tokenAddr = addr.NonMintableToken;
    const connectorAddr = addr.connectors?.[dstChain]?.NATIVE_BRIDGE;

    if (!vaultAddr || !tokenAddr || !connectorAddr)
      throw new Error("Some contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    const vault: Contract = (
      await getInstance(CONTRACTS.Vault, vaultAddr)
    ).connect(socketSigner);
    const token: Contract = (
      await getInstance(CONTRACTS.NonMintableToken, tokenAddr)
    ).connect(socketSigner);

    // approve
    const balance: BigNumber = await token.balanceOf(socketSigner.address);
    if (balance.lt(amount)) throw new Error("Not enough balance");

    const limit: BigNumber = await vault.getCurrentLockLimit(connectorAddr);
    if (limit.lt(amount)) throw new Error("Exceeding max limit");

    const currentApproval: BigNumber = await token.allowance(
      socketSigner.address,
      vault.address
    );
    if (currentApproval.lt(amount)) {
      const approveTx = await token.approve(vault.address, amount);
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    // deposit
    console.log(`depositing ${amount} to app chain from ${srcChain}`);

    const socket: Contract = getSocket(srcChain, socketSigner);
    const value = await socket.getMinFees(
      gasLimit,
      100,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      dstChain,
      connectorAddr
    );

    const depositTx = await vault.depositToAppChain(
      socketSigner.address,
      amount,
      gasLimit,
      connectorAddr,
      { ...overrides[srcChain], value }
    );
    console.log("Tokens deposited: ", depositTx.hash);
    console.log(
      `Track message here: https://6il289myzb.execute-api.us-east-1.amazonaws.com/dev/messages-from-tx?srcChainSlug=${srcChain}&srcTxHash=${depositTx.hash}`
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
