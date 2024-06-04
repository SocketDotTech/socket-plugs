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
      controllerChains: [ChainSlug.REYA_CRONOS],
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.USDT]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.DAI]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
    },
    [Tokens.WBTC]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
    },
  },
};
