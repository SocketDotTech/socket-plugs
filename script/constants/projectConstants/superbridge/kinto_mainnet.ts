import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

// If `sendingLimit` is not defined or is "", it defaults to max uint256
// If `receivingLimit` is not defined or is "", it defaults to max uint256
// If `sendingRatePerSecond` is not defined or is "", it defaults to daily limit (86400 seconds)
// If `receivingRatePerSecond` is not defined or is "", it defaults to daily limit (86400 seconds)
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
              sendingLimit: "",
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
              receivingLimit: "",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "",
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "",
              receivingLimit: "4000000",
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
              receivingLimit: "930",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "930",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "930",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "930",
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
              receivingLimit: "1135",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1135",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "1135",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "1135",
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
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "4000000",
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
              receivingLimit: "5714000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "5714000",
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
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "4000000",
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
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
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
              receivingLimit: "1088",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1088",
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
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
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
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
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
              receivingLimit: "4000000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "4000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
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
              receivingLimit: "1088",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1088",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "1088",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              receivingLimit: "1088",
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
              receivingLimit: "1050000",
            },
          },
          [ChainSlug.KINTO]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1050000",
            },
          },
        },
      },
    },
  },
};
