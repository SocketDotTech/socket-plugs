import { ChainSlug, isTestnet } from "@socket.tech/dl-core";
import { getProjectTokenConstants } from "./constants";
import { getInstance, getProjectAddresses } from "./utils";
import {
  NonAppChainAddresses,
  SuperBridgeContracts,
  Tokens,
  tokenDecimals,
} from "../../src";
import { utils } from "ethers";
import { getSignerFromChainSlug, overrides } from "./networks";

const receiver = "";
const amount = "100";

export const main = async () => {
  const addresses = await getProjectAddresses();
  const pc = getProjectTokenConstants();
  const nonAppChainsList: ChainSlug[] = Object.keys(pc.nonAppChains).map((k) =>
    parseInt(k)
  );
  console.log(`chains ${nonAppChainsList}`);
  await Promise.all(
    nonAppChainsList.filter(isTestnet).map(async (chain) => {
      const socketSigner = getSignerFromChainSlug(chain);
      const tokens = Object.keys(addresses[chain]) as Tokens[];
      for (const token of tokens) {
        const tokenAddress: string = (
          addresses[chain][token] as NonAppChainAddresses
        )[SuperBridgeContracts.NonMintableToken];
        const tokenContract = await getInstance("ERC20", tokenAddress);
        const amountBN = utils.parseUnits(amount, tokenDecimals[token]);
        console.log(
          `Sending ${amountBN.toString()} ${token} to ${receiver} on chain ${chain}`
        );
        const tx = await tokenContract
          .connect(socketSigner)
          .transfer(receiver, amountBN, { ...overrides[chain] });
        await tx.wait();
        console.log(`Sent ${token} on ${chain}: ${tx.hash}`);
      }
    })
  );
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
