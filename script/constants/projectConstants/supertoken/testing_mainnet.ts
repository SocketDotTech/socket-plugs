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
      vaultChains: [ChainSlug.ARBITRUM],
      controllerChains: [ChainSlug.OPTIMISM],
      superTokenInfo: {
        name: "SuperMockToken",
        symbol: "SMTK",
        decimals: 18,
        initialSupplyOwner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        owner: "0x572E38236eA3632b779962e27b47B3Dd75Fee127",
        initialSupply: "0",
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.OPTIMISM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100",
              receivingLimit: "100",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100",
              receivingLimit: "100",
            },
          },
        },
      },
    },
  },
};
