import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";
import { getOwner } from "../../config";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.WEETHC]: {
      vaultChains: [ChainSlug.LYRA],
      controllerChains: [ChainSlug.ARBITRUM, ChainSlug.MAINNET],
      superTokenInfo: {
        name: "Wrapped eETH Covered Call",
        symbol: "weETHC",
        decimals: 18,
        initialSupplyOwner: "0x0000000000000000000000000000000000000000",
        owner: getOwner(),
        initialSupply: "0",
      }, // set fields as undefined so token isn't deployed
      hook: {
        hookType: Hooks.LYRA_TSA_WITHDRAW_HOOK,
        // hookType: Hooks.LYRA_TSA_WITHDRAW_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.ARBITRUM]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 1,
            },
          },
          [ChainSlug.MAINNET]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
              poolCount: 1,
            },
          },
        },
      },
    },
    [Tokens.RSWETHC]: {
      vaultChains: [ChainSlug.LYRA],
      controllerChains: [ChainSlug.MAINNET],
      superTokenInfo: {
        name: "rswETH Covered Call",
        symbol: "rswETHC",
        decimals: 18,
        initialSupplyOwner: "0x0000000000000000000000000000000000000000",
        owner: getOwner(),
        initialSupply: "0",
      }, // set fields as undefined so token isn't deployed
      hook: {
        hookType: Hooks.LYRA_TSA_WITHDRAW_HOOK,
        // hookType: Hooks.LYRA_TSA_WITHDRAW_HOOK,
        limitsAndPoolId: {
          [ChainSlug.LYRA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1000000",
              receivingLimit: "1000000",
            },
          },
          [ChainSlug.MAINNET]: {
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
