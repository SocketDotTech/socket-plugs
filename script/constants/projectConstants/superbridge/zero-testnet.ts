import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.SURGE]: {
    [Tokens.USDC]: {
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      controllerChains: [4457845],
      tokenAddresses: {
        4457845: "0x90B667E7B071a611935C038f14cf57fdF2c9B313",
      },
      hook: {
        hookType: Hooks.NO_HOOK,
      },
    },
  },
};
