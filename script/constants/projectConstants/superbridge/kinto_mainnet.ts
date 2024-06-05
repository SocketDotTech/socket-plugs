import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.DAI]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
        },
      },
    },
    [Tokens.WSTETH]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "2200",
              sendingRatePerSecond: "2200",
              receivingLimit: "2200",
              receivingRatePerSecond: "2200",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "2200",
              sendingRatePerSecond: "2200",
              receivingLimit: "2200",
              receivingRatePerSecond: "2200",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
        },
      },
    },
    [Tokens.WETH]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
        },
      },
    },
    [Tokens.USDC]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
        },
      },
    },
    [Tokens.ENA]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1400000",
              receivingLimit: "1400000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1400000",
              receivingLimit: "1400000",
            },
          },
        },
      },
    },
    [Tokens.USDe]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
        },
      },
    },
    [Tokens.EIGEN]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
        },
      },
    },
    [Tokens.eETH]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "324",
              receivingLimit: "324",
            },
          },
        },
      },
    },
    [Tokens.sDAI]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              sendingRatePerSecond: "4000000",
              receivingLimit: "4000000",
              receivingRatePerSecond: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              sendingRatePerSecond: "4000000",
              receivingLimit: "4000000",
              receivingRatePerSecond: "4000000",
            },
          },
        },
      },
    },
    [Tokens.sUSDe]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              sendingRatePerSecond: "4000000",
              receivingLimit: "4000000",
              receivingRatePerSecond: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              sendingRatePerSecond: "4000000",
              receivingLimit: "4000000",
              receivingRatePerSecond: "4000000",
            },
          },
        },
      },
    },
    [Tokens.wUSDM]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              receivingLimit: "4000000",
            },
          },
        },
      },
    },
    [Tokens.weETH]: {
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "2200",
              sendingRatePerSecond: "2200",
              receivingLimit: "2200",
              receivingRatePerSecond: "2200",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "2200",
              sendingRatePerSecond: "2200",
              receivingLimit: "2200",
              receivingRatePerSecond: "2200",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "314",
              receivingLimit: "314",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "314",
              receivingLimit: "314",
            },
          },
        },
      },
    },
    [Tokens.ETHFI]: {
      vaultChains: [ChainSlug.MAINNET],
      controllerChains: [ChainSlug.KINTO],
      hook: {
        hookType: Hooks.KINTO_HOOK,
        limitsAndPoolId: {
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "300000",
              sendingRatePerSecond: "300000",
              receivingLimit: "300000",
              receivingRatePerSecond: "300000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "300000",
              sendingRatePerSecond: "300000",
              receivingLimit: "300000",
              receivingRatePerSecond: "300000",
            },
          },
        },
      },
    },
  },
};
