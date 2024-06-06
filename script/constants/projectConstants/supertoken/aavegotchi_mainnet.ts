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
        name: "FUD",
        symbol: "FUD",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
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
        name: "FOMO",
        symbol: "FOMO",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
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
        name: "ALPHA",
        symbol: "ALPHA",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
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
        name: "KEK",
        symbol: "KEK",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
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
        name: "GLTR",
        symbol: "GLTR",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
      },
    },
  },
};
