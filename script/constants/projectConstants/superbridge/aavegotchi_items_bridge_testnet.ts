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
    [NFTs.GOTCHI_ITEM]: {
      vaultChains: [84532],
      controllerChains: [631571],
      tokenAddresses: {
        84532: "0x87C969d083189927049f8fF3747703FB9f7a8AEd",
        631571: "0x954B9F6DaB28F92c88192E2F52FDa5A6Df4A0334",
      },
      hook: {
        hookType: Hooks.NO_HOOK,
      },
    },
  },
};
