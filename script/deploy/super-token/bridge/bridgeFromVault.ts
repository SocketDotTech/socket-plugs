import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../../../helpers/networks";
import { ChainSlug } from "@socket.tech/dl-core";
import { getSocket, getInstance, getVault } from "./utils";
import { SuperTokenChainAddresses, SuperTokenContracts } from "../../../../src";
import { getSuperTokenProjectAddresses } from "../utils";
import { getTokenConstants } from "../../../helpers/constants";

const srcChain = ChainSlug.OPTIMISM_SEPOLIA;
const dstChain = ChainSlug.ARBITRUM_SEPOLIA;
const gasLimit = 500_000;
const amount = "10";

export const main = async () => {
  try {
    const config = getTokenConstants();
    const addresses = await getSuperTokenProjectAddresses(
      config.projectName.toLowerCase() + "_" + config.type.toLowerCase()
    );

    const srcAddresses: SuperTokenChainAddresses | undefined =
      addresses[srcChain];
    const dstAddresses: SuperTokenChainAddresses | undefined =
      addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const tokenAddr = srcAddresses[SuperTokenContracts.NonSuperToken];

    const socketSigner = getSignerFromChainSlug(srcChain);
    const amountToBridge = utils.parseUnits(amount, config.tokenDecimal);

    const vault: Contract = (await getVault(config, srcAddresses)).connect(
      socketSigner
    );
    const tokenContract: Contract = (
      await getInstance("ERC20", tokenAddr)
    ).connect(socketSigner);

    // approve
    const balance: BigNumber = await tokenContract.balanceOf(
      socketSigner.address
    );
    if (balance.lt(amountToBridge)) throw new Error("Not enough balance");

    const limit: BigNumber = await vault.getCurrentLockLimit(dstChain);
    if (limit.lt(amountToBridge))
      throw new Error(`Exceeding max limit ${limit}`);

    const currentApproval: BigNumber = await tokenContract.allowance(
      socketSigner.address,
      vault.address
    );
    if (currentApproval.lt(amountToBridge)) {
      const approveTx = await tokenContract.approve(
        vault.address,
        amountToBridge,
        {
          ...overrides[srcChain as ChainSlug],
        }
      );
      console.log("Tokens approved: ", approveTx.hash);
      await approveTx.wait();
    }

    // deposit
    console.log(`withdrawing ${amountToBridge} from app chain to ${dstChain}`);

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
      amountToBridge,
      gasLimit,
      "0x",
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
