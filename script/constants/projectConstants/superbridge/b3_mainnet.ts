import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.B3]: {
      vaultChains: [ChainSlug.BASE],
      controllerChains: [ChainSlug.B3],
      isFiatTokenV2_1: true,
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.B3]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000000",
              receivingLimit: "1000000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000000",
              receivingLimit: "1000000000",
            },
          },
        },
      },
    },
  },
};
