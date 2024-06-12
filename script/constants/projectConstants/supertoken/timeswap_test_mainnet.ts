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
        name: "Timeswap Test",
        symbol: "TSWP",
        decimals: 18,
        initialSupply: "0",
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
      },
    },
  },
};
