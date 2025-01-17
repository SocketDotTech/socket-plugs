import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { NFTs, Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [NFTs.GOTCHI_ITEM]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.GEIST],
      tokenAddresses: {
        [ChainSlug.POLYGON_MAINNET]:
          "0x58de9AaBCaeEC0f69883C94318810ad79Cc6a44f",
        [ChainSlug.GEIST]: "0xaC336aB3CFC58698B582205A861A5C6B798c01B9",
      },
      hook: {
        hookType: Hooks.NO_HOOK,
      },
    },
  },
};
