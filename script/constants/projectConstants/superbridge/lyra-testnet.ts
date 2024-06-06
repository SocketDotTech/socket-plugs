import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.WEETH]: {
      controllerChains: [ChainSlug.LYRA_TESTNET],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
      hook: {
        hookType: Hooks.LYRA_TSA_DEPOSIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA_TESTNET]: {
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
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.RSWETH]: {
      controllerChains: [ChainSlug.LYRA_TESTNET],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LYRA_TSA_DEPOSIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA_TESTNET]: {
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
        },
      },
    },
    [Tokens.RSETH]: {
      controllerChains: [ChainSlug.LYRA_TESTNET],
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
      hook: {
        hookType: Hooks.LYRA_TSA_DEPOSIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA_TESTNET]: {
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
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000000",
              receivingLimit: "100000000",
              poolCount: 0,
            },
          },
        },
      },
    },
  },
};
