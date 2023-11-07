import hre from "hardhat";
import fs from "fs";

import { deploymentsPath, verify } from "./utils";
import { mode, project } from "./constants";
import {
  ChainSlug,
  ChainSlugToKey as ChainSlugToHardhatKey,
} from "@socket.tech/dl-core";

export type VerifyParams = {
  [chain in ChainSlug]?: VerifyArgs[];
};
type VerifyArgs = [string, string, string, any[]];

/**
 * Deploys network-independent socket contracts
 */
export const main = async () => {
  try {
    const path = deploymentsPath + `${mode}_${project}_verification.json`;
    if (!fs.existsSync(path)) {
      throw new Error("addresses.json not found");
    }
    let verificationParams: VerifyParams = JSON.parse(
      fs.readFileSync(path, "utf-8")
    );

    const chains: ChainSlug[] = Object.keys(verificationParams).map((c) =>
      Number(c)
    );
    if (!chains) return;

    for (let chainIndex = 0; chainIndex < chains.length; chainIndex++) {
      const chain = chains[chainIndex];
      if (
        chain == ChainSlug.AEVO ||
        chain == ChainSlug.AEVO_TESTNET ||
        chain == ChainSlug.LYRA ||
        chain == ChainSlug.LYRA_TESTNET ||
        chain == ChainSlug.SX_NETWORK_TESTNET
      )
        continue;
      // hre.changeNetwork(ChainSlugToHardhatKey[chain]);
      if (hre.network.name !== ChainSlugToHardhatKey[chain]) continue;
      const chainParams: VerifyArgs[] | undefined = verificationParams[chain];
      if (!chainParams) continue;
      if (chainParams.length) {
        const len = chainParams.length;
        for (let index = 0; index < len!; index++)
          await verify(...chainParams[index]);
      }
    }
  } catch (error) {
    console.log("Error in deploying setup contracts", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
