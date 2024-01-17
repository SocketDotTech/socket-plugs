import { BigNumber, Contract } from "ethers";

import { getSignerFromChainSlug, overrides } from "../../../helpers/networks";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket, getInstance } from "./utils";
import { SuperTokenChainAddresses, SuperTokenContracts } from "../../../../src";
import { amount, config, dstChain, gasLimit, srcChain } from "../config";
import { getSuperTokenProjectAddresses } from "../utils";

export const main = async () => {
  try {
    const addresses = await getSuperTokenProjectAddresses(
      config.projectName.toLowerCase()
    );

    const srcAddresses: SuperTokenChainAddresses | undefined =
      addresses[srcChain];
    const dstAddresses: SuperTokenChainAddresses | undefined =
      addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const vaultAddr = srcAddresses[SuperTokenContracts.SuperTokenVault];
    const tokenAddr = srcAddresses[SuperTokenContracts.NonSuperToken];
    if (!vaultAddr || !tokenAddr)
      throw new Error("Some contract addresses missing");

    const socketSigner = getSignerFromChainSlug(srcChain);

    const vault: Contract = (
      await getInstance(SuperTokenContracts.SuperTokenVault, vaultAddr)
    ).connect(socketSigner);

    const tokenContract: Contract = (
      await getInstance("ERC20", tokenAddr)
    ).connect(socketSigner);

    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amount)) throw new Error("Not enough balance");

    const limit: BigNumber = await vault.getCurrentLockLimit(dstChain);
    if (limit.lt(amount)) throw new Error(`Exceeding max limit ${limit}`);

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      vault.address
    );
    if (currentApproval.lt(amount)) {
      const approveTx = await tokenContract.approve(vault.address, amount, {
        ...overrides[srcChain as ChainSlug],
      });
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
      srcAddresses[SuperTokenContracts.SocketPlug]
    );

    const withdrawTx = await vault.bridge(
      socketSigner.address,
      dstChain,
      amount,
      gasLimit,
      { ...overrides[srcChain as ChainSlug], value }
    );
    console.log("Tokens locked", withdrawTx.hash);
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
