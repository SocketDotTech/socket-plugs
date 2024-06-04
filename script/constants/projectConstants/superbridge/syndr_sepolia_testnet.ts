import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.SYNDR_SEPOLIA_L3]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000000",
              receivingLimit: "1000000",
            },
          },
        },
      },
    },
  },
};
