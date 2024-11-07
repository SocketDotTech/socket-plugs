import { DeploymentMode } from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

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
        name: "Socket GHST",
        symbol: Tokens.SGHST,
        decimals: 18,
        owner: "0xd38Df837a1EAd12ee16f8b8b7E5F58703f841668",
        initialSupplyOwner: "0xd38Df837a1EAd12ee16f8b8b7E5F58703f841668",
        initialSupply: "0",
      },
    },
  },
};
