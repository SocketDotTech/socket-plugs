import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";
import { getOwner } from "../../config";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.GUARD]: {
      vaultChains: [ChainSlug.BSC],
      controllerChains: [ChainSlug.ARBITRUM, ChainSlug.POLYGON_MAINNET],
      superTokenInfo: {
        name: "Guardian",
        symbol: "GUARD",
        decimals: 18,
        initialSupplyOwner: getOwner(),
        owner: getOwner(),
        initialSupply: "0",
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.BSC]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "50000",
              receivingLimit: "50000",
            },
          },
        },
      },
    },
  },
};
