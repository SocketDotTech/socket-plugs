import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { NFTs, Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET /*ChainSlug.BASE*/],
      controllerChains: [ChainSlug.GEIST],
      tokenAddresses: {
        [ChainSlug.GEIST]: "0xCFa0bC1ED6135166e9163211b4Ca566a0EE81e35",
      },
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          // [ChainSlug.MAINNET]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "100000",
          //     receivingLimit: "100000",
          //   },
          // },
          [ChainSlug.POLYGON_MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
            },
          },
          [ChainSlug.BASE]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
            },
          },
          // [ChainSlug.ARBITRUM]: {
          //   [IntegrationTypes.fast]: {
          //     sendingLimit: "100000",
          //     receivingLimit: "100000",
          //   },
          // },
          [ChainSlug.GEIST]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100000",
              receivingLimit: "100000",
            },
          },
        },
      },
    },
  },
};
