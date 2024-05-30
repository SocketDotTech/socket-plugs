import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.STIME]: {
      vaultChains: [ChainSlug.ARBITRUM],
      controllerChains: [ChainSlug.OPTIMISM],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000.0",
              receivingLimit: "1000000.0",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000.0",
              receivingLimit: "1000000.0",
            },
          },
        },
      },
      superTokenInfo: {
        address: "0x5e24d4e71d8fc876af3D45499f6b9E8A296EC694",
      },
    },
  },
};
