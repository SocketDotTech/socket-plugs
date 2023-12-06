import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";
import { token, tokenDecimals } from "../helpers/constants";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket } from "./utils";
import {
  SuperBridgeContracts,
  ChainAddresses,
  NonAppChainAddresses,
} from "../../src";

const srcChain = ChainSlug.SEPOLIA;
const dstChain = ChainSlug.LYRA_TESTNET;
const gasLimit = 500_000;
let amount = utils.parseUnits("1", tokenDecimals[token]);

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    const srcAddresses: ChainAddresses | undefined = addresses[srcChain];
    const dstAddresses: ChainAddresses | undefined = addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const addr: NonAppChainAddresses | undefined = srcAddresses[
      token
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

    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amount)) throw new Error("Not enough balance");

    const limit: BigNumber = await vault.getCurrentLockLimit(connectorAddr);
    if (limit.lt(amount)) throw new Error("Exceeding max limit");

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      vault.address
    );
    if (currentApproval.lt(amount)) {
      const approveTx = await tokenContract.approve(vault.address, amount, {
        ...overrides[srcChain],
        gasLimit: 200_000,
      });
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
