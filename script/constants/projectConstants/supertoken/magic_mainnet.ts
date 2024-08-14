import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.MAGIC]: {
      vaultChains: [ChainSlug.ARBITRUM],
      controllerChains: [ChainSlug.OPTIMISM],
      hook: {
        hookType: Hooks.NO_HOOK,
      },
      superTokenInfo: {
        name: "magic",
        symbol: Tokens.MAGIC,
        decimals: 18,
        owner: "0xdE7f7a699F8504641eceF544B0fbc0740C37E69B",
        initialSupplyOwner: "0xdE7f7a699F8504641eceF544B0fbc0740C37E69B",
        initialSupply: "0",
      },
    },
  },
};
