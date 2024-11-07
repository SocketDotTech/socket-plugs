
import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { NFTs, Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.SURGE]: {
    [Tokens.USDC]: {
      vaultChains: [80002],
      controllerChains: [631571],
      tokenAddresses: {
        80002: "0x41e94eb019c0762f9bfcf9fb1e58725bfb0e7582",
        631571: "0x6cF5c0342c98E9D344aFd44A8AE399DbF4E018fC"
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          80002: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000"
            }
          },
          631571: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000"
            }
          }
        }
      }
    }
  }
};
