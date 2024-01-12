import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
      isFiatTokenV2_1: true,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "10000000",
          // depositRate: "10000000",
          depositRate: "115.74",
          withdrawLimit: "1000000",
          // withdrawRate: "1000000",
          withdrawRate: "11.574",
          poolCount: 0,
        },
        // [IntegrationTypes.native]: {
        //   depositLimit: "10000000",
        //   // depositRate: "10000000",
        //   depositRate: "115.74",
        //   withdrawLimit: "0",
        //   withdrawRate: "0",
        //   poolCount: 0,
        // },
      },
    },
    [Tokens.USDCE]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
      isFiatTokenV2_1: true,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "10000000",
          // depositRate: "10000000",
          depositRate: "115.74",
          withdrawLimit: "1000000",
          // withdrawRate: "1000000",
          withdrawRate: "11.574",
          poolCount: 0,
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.MAINNET, ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "5000",
          // depositRate: "5000",
          depositRate: "0.05787037",
          withdrawLimit: "500",
          // withdrawRate: "500",
          withdrawRate: "0.00578703",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "5000",
          // depositRate: "5000",
          depositRate: "0.05787037",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
    [Tokens.WBTC]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.MAINNET, ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "250",
          // depositRate: "250",
          depositRate: "0.00289351",
          withdrawLimit: "25",
          // withdrawRate: "25",
          withdrawRate: "0.00028935",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "250",
          // depositRate: "250",
          depositRate: "0.00289351",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
  },
};

export = pc;
