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
      controllerChains: [ChainSlug.LYRA],
      vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM],
      hook: {
        hookType: Hooks.LYRA_TSA_DEPOSIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 0,
            },
          },
        },
      },
    },
    [Tokens.RSWETH]: {
      controllerChains: [ChainSlug.LYRA],
      vaultChains: [ChainSlug.MAINNET],
      hook: {
        hookType: Hooks.LYRA_TSA_DEPOSIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 0,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 0,
            },
          },
        },
      },
    },
  },
};
