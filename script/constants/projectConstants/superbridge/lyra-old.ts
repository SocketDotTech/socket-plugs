import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants, Tokens } from "../../../../src";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    // [Tokens.USDC]: {
    //   isFiatTokenV2_1: true,
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 1,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 1,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.BASE]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 1,
    //       },
    //     },
    //   },
    // },
    // [Tokens.USDCE]: {
    //   isFiatTokenV2_1: true,
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.USDT]: {
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "11.574",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "10000000",
    //         depositRate: "115.74",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.WETH]: {
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.005787037",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.005787037",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.BASE]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.005787037",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.00578703",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.WBTC]: {
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.SNX]: {
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "1000000",
    //         depositRate: "11.57407",
    //         withdrawLimit: "100",
    //         withdrawRate: "0.00115741",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "1000000",
    //         depositRate: "11.57407",
    //         withdrawLimit: "1000000",
    //         withdrawRate: "1000000",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "1000",
    //         depositRate: "0.01157407",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.WSTETH]: {
    //   appChain: ChainSlug.LYRA,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.BASE]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "250",
    //         depositRate: "0.00289351",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.MAINNET]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "500",
    //         depositRate: "0.005787037",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "500",
    //         depositRate: "0.005787037",
    //         withdrawLimit: "25",
    //         withdrawRate: "0.00028935",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
  },
};

export = pc;
