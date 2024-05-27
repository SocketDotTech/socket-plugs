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
      vaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
      controllerChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.AEVO_TESTNET],
      superTokenInfo: {
        name: "Leaf",
        symbol: "LEAF",
        decimals: 6,
        initialSupplyOwner: "0xab2f8c1588aca57bc2909512b645a860c65770d3",
        owner: "0xab2f8c1588aca57bc2909512b645a860c65770d3",
        initialSupply: "1000000000",
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.AEVO_TESTNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
              poolCount: 1,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
              poolCount: 1,
            },
          },
        },
      },
    },
    [Tokens.USDCE]: {
      vaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
      controllerChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.AEVO_TESTNET],
      superTokenInfo: {
        name: "Leaf",
        symbol: "LEAF",
        decimals: 6,
        initialSupplyOwner: "0xab2f8c1588aca57bc2909512b645a860c65770d3",
        owner: "0xab2f8c1588aca57bc2909512b645a860c65770d3",
        initialSupply: "1000000000",
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.AEVO_TESTNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
              poolCount: 1,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
              poolCount: 1,
            },
          },
        },
      },
    },
  },
};
