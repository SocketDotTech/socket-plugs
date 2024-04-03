import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import {
  Hooks,
  ProjectConstants,
  ProjectType,
  TokenConstants,
  Tokens,
} from "../../../src";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      vaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
      controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
              poolCount: 1,
            },
          },
        },
      },
    },
  },
};

export = pc;
