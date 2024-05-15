import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants, ProjectType, Tokens } from "../../../../src";
import { getSocketOwner } from "../../config";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.WEETHC]: {
      vaultChains: [ChainSlug.LYRA_TESTNET],
      controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
      superTokenInfo: {
        name: "Lyra Wrapped eETH Covered Call Shares",
        symbol: "weETHC",
        decimals: 18,
        initialSupplyOwner: getSocketOwner(),
        owner: getSocketOwner(),
        initialSupply: 0,
      } as any, // set fields as undefined so token isn't deployed
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA_TESTNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 1,
            },
          },
        },
      },
    },
  },
};

export = pc;
