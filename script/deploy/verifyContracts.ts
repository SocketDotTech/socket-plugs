import hre from "hardhat";
import fs from "fs";

import { verify } from "../helpers/deployUtils";
import {
  ChainSlug,
  ChainSlugToKey as ChainSlugToHardhatKey,
} from "@socket.tech/dl-core";
import { getVerificationPath } from "../helpers/utils";

export type VerifyParams = {
  [chain in ChainSlug]?: VerifyArgs[];
};
type VerifyArgs = [string, string, string, any[]];

/**
 * Deploys network-independent socket contracts
 */
export const main = async () => {
  try {
    const path = getVerificationPath();
    if (!fs.existsSync(path)) {
      throw new Error("addresses.json not found");
    }
    let verificationParams: VerifyParams = JSON.parse(
      fs.readFileSync(path, "utf-8")
    );

    const chains: ChainSlug[] = Object.keys(verificationParams).map((c) =>
      Number(c)
    );

    console.log("Chains array:", chains);
    if (!chains) {
      console.log("No chains found, exiting.");
      return;
    }

    for (let chainIndex = 0; chainIndex < chains.length; chainIndex++) {
      console.log(`Verifying contracts for chain ${chains[chainIndex]}...`);

      const chain = chains[chainIndex];
      // hre.changeNetwork(ChainSlugToHardhatKey[chain]);
      if (hre.network.name !== ChainSlugToHardhatKey[chain]) {
        console.log(
          `Skipping verification for chain ${chain} as the network param does not match.`
        );
        continue;
      }
      const chainParams: VerifyArgs[] | undefined = verificationParams[chain];
      if (!chainParams) continue;
      if (chainParams.length) {
        const len = chainParams.length;
        for (let index = 0; index < len!; index++)
          await verify(...chainParams[index]);
      }
    }
  } catch (error) {
    console.log("Error in contract verification", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
