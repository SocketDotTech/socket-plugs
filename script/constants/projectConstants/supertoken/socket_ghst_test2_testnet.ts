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
    [Tokens.SGHST]: {
      vaultChains: [80002],
      controllerChains: [631571],
      hook: {
        hookType: Hooks.UNWRAP_HOOK,
      },
      superTokenInfo: {
        name: "Aavegotchi Socket GHST",
        symbol: Tokens.SGHST,
        decimals: 18,
        owner: "0x3a2E7D1E98A4a051B0766f866237c73643fDF360",
        initialSupplyOwner: "0x3a2E7D1E98A4a051B0766f866237c73643fDF360",
        initialSupply: "0",
      },
    },
  },
};
