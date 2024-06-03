
import {
    ChainSlug,
    DeploymentMode,
    IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
    [DeploymentMode.PROD]: {
  [Tokens.TEST1]: {
    vaultChains: [ChainSlug.SEPOLIA],
    controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
    hook: {
      hookType: Hooks.LIMIT_HOOK,
      limitsAndPoolId: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {

          }
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {

          }
        }
      }
    },
    superTokenInfo: {
      name: Tokens.TEST1,
      symbol: Tokens.TEST1,
      decimals: 18,
      owner: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      initialSupplyOwner: "0x514910771AF9Ca656af840dff83E8264EcF986CA",
      initialSupply: "0"
    }
  }
}
};
