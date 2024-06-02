
import {
    ChainSlug,
    DeploymentMode,
    IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
    [DeploymentMode.PROD]: {
  [Tokens.TOKEN1]: {
    vaultChains: [ChainSlug.SEPOLIA],
    controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
    hook: {
      hookType: Hooks.LIMIT_HOOK,
      limitsAndPoolId: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100.0",
            receivingLimit: "100.0"
          }
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100.0",
            receivingLimit: "100.0"
          }
        }
      }
    }
  }
}
};
