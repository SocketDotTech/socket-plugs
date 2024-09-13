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
    [Tokens.USDC]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [ChainSlug.MAINNET, ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
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
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 1,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 1,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 1,
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
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
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
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
        ChainSlug.BASE,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
        },
      },
    },
    [Tokens.ETH]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
        ChainSlug.BASE,
      ],
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
              poolCount: 1,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.POLYGON_MAINNET,
        ChainSlug.ARBITRUM,
        ChainSlug.MAINNET,
        ChainSlug.OPTIMISM,
        ChainSlug.BASE,
      ],
    },
    [Tokens.WBTC]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1581.52",
              receivingLimit: "1581.52",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1581.52",
              receivingLimit: "1581.52",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1581.52",
              receivingLimit: "1581.52",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1581.52",
              receivingLimit: "1581.52",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1581.52",
              receivingLimit: "1581.52",
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
    [Tokens.USDE]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [ChainSlug.MAINNET],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
        },
      },
    },
    [Tokens.WSTETH]: {
      controllerChains: [ChainSlug.REYA],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "32203.42",
              receivingLimit: "32203.42",
            },
          },
        },
      },
      vaultChains: [ChainSlug.MAINNET],
    },
    [Tokens.SUSDE]: {
      controllerChains: [ChainSlug.REYA],
      vaultChains: [
        ChainSlug.MAINNET,
        ChainSlug.BASE,
        ChainSlug.OPTIMISM,
        ChainSlug.ARBITRUM,
      ],
      hook: {
        hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
          [ChainSlug.REYA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
            },
          },
        },
      },
    },
  },
};
