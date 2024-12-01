
import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { NFTs, Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.SURGE]: {
    [NFTs.GOTCHI]: {
      vaultChains: [84532],
      controllerChains: [631571],
      tokenAddresses: {
        84532: "0xf81FFb9E2a72574d3C4Cf4E293D4Fec4A708F2B1",
        631571: "0x226625C1B1174e7BaaE8cDC0432Db0e2ED83b7Ba"
      },
      hook: {
        hookType: Hooks.NO_HOOK
      }
    }
  }
};
