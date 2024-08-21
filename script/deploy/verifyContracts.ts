import hre from "hardhat";
import fs from "fs";

import { verify } from "../helpers/deployUtils";
import {
  ChainSlug,
  ChainSlugToKey as ChainSlugToHardhatKey,
} from "@socket.tech/dl-core";
import { getVerificationPath } from "../helpers/utils";
import { CustomNetworksConfig } from "../../hardhat.config";

export type VerifyParams = {
  [chainSlug in ChainSlug]?: VerifyArgs[];
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

    const chainSlugs: ChainSlug[] = Object.keys(verificationParams).map((c) =>
      Number(c)
    );

    console.log("Chains array:", chainSlugs);
    if (!chainSlugs) {
      console.log("No chainSlugs found, exiting.");
      return;
    }

    for (let chainIndex = 0; chainIndex < chainSlugs.length; chainIndex++) {
      console.log(
        `Verifying contracts for chainSlug ${chainSlugs[chainIndex]}...`
      );

      const chainSlug = chainSlugs[chainIndex];
      // hre.changeNetwork(ChainSlugToHardhatKey[chainSlug]);

      if (
        hre.network.name !== ChainSlugToHardhatKey[chainSlug] &&
        CustomNetworksConfig[hre.network.name]?.chainId !== chainSlug
      ) {
        console.log(
          `Skipping verification for chainSlug ${chainSlug} as the network param does not match.`
        );
        continue;
      }
      const chainParams: VerifyArgs[] | undefined =
        verificationParams[chainSlug];
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
