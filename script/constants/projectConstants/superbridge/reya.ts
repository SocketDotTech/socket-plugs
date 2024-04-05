import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";

import { Hooks, ProjectConstants, ProjectType, Tokens } from "../../../../src";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [ChainSlug.MAINNET],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.USDCE]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.OPTIMISM,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 1,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 1,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 1,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 1,
            },
          },
        },
      },
    },
    [Tokens.USDT]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.DAI]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
      ],
    },
    [Tokens.WBTC]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
      ],
    },
  },
};
