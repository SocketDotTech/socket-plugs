import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDCE]: {
      controllerChains: [ChainSlug.AEVO],
      vaultChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
              poolCount: 1,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
              poolCount: 1,
            },
          },
          [ChainSlug.AEVO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
              poolCount: 1,
            },
          },
        },
      },
    },
    [Tokens.USDC]: {
      controllerChains: [ChainSlug.AEVO],
      vaultChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
            },
          },
          [ChainSlug.AEVO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "7000000",
              receivingLimit: "7000000",
            },
          },
        },
      },
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.AEVO],
      vaultChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1250",
              receivingLimit: "1250",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1250",
              receivingLimit: "1250",
            },
          },
          [ChainSlug.AEVO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1250",
              receivingLimit: "1250",
            },
          },
        },
      },
    },
  },
};
