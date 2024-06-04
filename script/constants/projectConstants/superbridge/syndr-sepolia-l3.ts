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
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          // [ChainSlug.SEPOLIA]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",

              receivingLimit: "10000",
            },
          },
          // [ChainSlug.POLYGON_MUMBAI]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
        },
      },
    },
    [Tokens.USDT]: {
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          // [ChainSlug.SEPOLIA]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",

              receivingLimit: "10000",
            },
          },
          // [ChainSlug.POLYGON_MUMBAI]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
        },
      },
    },
    [Tokens.DAI]: {
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",

              receivingLimit: "10000",
            },
          },
        },
      },
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          // [ChainSlug.SEPOLIA]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",

              receivingLimit: "10000",
            },
          },
          // [ChainSlug.POLYGON_MUMBAI]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
        },
      },
    },
    [Tokens.WBTC]: {
      controllerChains: [ChainSlug.SYNDR_SEPOLIA_L3],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          // [ChainSlug.SEPOLIA]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",

              receivingLimit: "10000",
            },
          },
          // [ChainSlug.POLYGON_MUMBAI]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "10000",
          //
          //     receivingLimit: "10000",
          //
          //
          //   },
          // },
        },
      },
    },
  },
};
