import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.FUD]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "206764280",
              receivingLimit: "206764280",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "206764280",
              receivingLimit: "206764280",
            },
          },
        },
      },
    },
    [Tokens.FOMO]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "103912618",
              receivingLimit: "103912618",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "103912618",
              receivingLimit: "103912618",
            },
          },
        },
      },
    },
    [Tokens.ALPHA]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "51694235",
              receivingLimit: "51694235",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "51694235",
              receivingLimit: "51694235",
            },
          },
        },
      },
    },
    [Tokens.KEK]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "20595418",
              receivingLimit: "20595418",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "20595418",
              receivingLimit: "20595418",
            },
          },
        },
      },
    },
    [Tokens.GLTR]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.BASE],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000000000",
              receivingLimit: "10000000000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000000000",
              receivingLimit: "10000000000",
            },
          },
        },
      },
    },
  },
};
