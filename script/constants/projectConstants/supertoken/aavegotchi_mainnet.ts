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
      superTokenInfo: {
        address: "0x4595Ea2d4d76e067D6701552b8A66743f048A38b",
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
      superTokenInfo: {
        address: "0xB501045c286E2e499D761106Da367B7b9D72De9e",
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
      superTokenInfo: {
        address: "0x73e49fa294e6198400cA693a856816E23D0968Ee",
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
      superTokenInfo: {
        address: "0x59c98408F27517937D2065d61862eBF129B07FD9",
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
      superTokenInfo: {
        address: "0x2D400eB3beee681471F59da5B1a0d61A18Dee743",
      },
    },
  },
};
