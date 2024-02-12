import { BigNumber, Contract, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../../../helpers/networks";
import {
  ChainSlug,
  SuperTokenChainAddresses,
  SuperTokenContracts,
} from "../../../../src";
import { getSuperTokenProjectAddresses } from "../utils";
import { getSocket, getInstance, getToken } from "./utils";
import { getTokenConstants } from "../../../helpers/constants";

const srcChain = ChainSlug.ARBITRUM_SEPOLIA;
const dstChain = ChainSlug.OPTIMISM_SEPOLIA;
const gasLimit = 500_000;
const amount = "2";

export const main = async () => {
  try {
    const config = getTokenConstants();
    const addresses = await getSuperTokenProjectAddresses(
      config.projectName.toLowerCase() + "_" + config.type.toLowerCase()
    );

    const amountToBridge = utils.parseUnits(amount, config.tokenDecimal);
    const srcAddresses: SuperTokenChainAddresses | undefined =
      addresses[srcChain];
    const dstAddresses: SuperTokenChainAddresses | undefined =
      addresses[dstChain];
    if (!srcAddresses || !dstAddresses)
      throw new Error("chain addresses not found");

    const socketSigner = getSignerFromChainSlug(srcChain);
    const tokenContract: Contract = (
      await getToken(config, srcAddresses)
    ).connect(socketSigner);

    const limit: BigNumber = await tokenContract.getCurrentSendingLimit(
      dstChain
    );
    if (limit.lt(amountToBridge))
      throw new Error(`Exceeding max limit ${limit}`);

    // deposit
    console.log(`depositing ${amountToBridge} to app chain from ${srcChain}`);

    const socket: Contract = getSocket(srcChain, socketSigner);
    const value = await socket.getMinFees(
      gasLimit,
      100,
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      "0x0000000000000000000000000000000000000000000000000000000000000000",
      dstChain,
      srcAddresses[SuperTokenContracts.SocketPlug]
    );

    const depositTx = await tokenContract.bridge(
      socketSigner.address,
      dstChain,
      amountToBridge,
      gasLimit,
      "0x",
      { ...overrides[srcChain], value }
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
