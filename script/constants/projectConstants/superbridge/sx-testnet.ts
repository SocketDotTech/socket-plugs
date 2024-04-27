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
      controllerChains: [ChainSlug.SX_NETWORK_TESTNET],
      vaultChains: [ChainSlug.SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",
              receivingLimit: "10000",
            },
          },
          [ChainSlug.SX_NETWORK_TESTNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "10000",
              receivingLimit: "10000",
            },
          },
        },
      },
    },
  },
};
