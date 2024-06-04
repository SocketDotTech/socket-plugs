import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.MTK]: {
      vaultChains: [ChainSlug.ARBITRUM_SEPOLIA],
      controllerChains: [ChainSlug.OPTIMISM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000",
              receivingLimit: "1000",
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000",
              receivingLimit: "1000",
            },
          },
        },
      },
      superTokenInfo: {
        name: "SuperMockToken",
        symbol: "SMTK",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
      },
    },
  },
};
