import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    // [Tokens.USDC]: {
    //   appChain: ChainSlug.LYRA_TESTNET,
    //   nonAppChains: {
    //     [ChainSlug.SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.OPTIMISM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //       [IntegrationTypes.native]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "0",
    //         withdrawRate: "0",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.WETH]: {
    //   appChain: ChainSlug.LYRA_TESTNET,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.00578703",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.ARBITRUM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "5000",
    //         depositRate: "0.05787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.00578703",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.SEPOLIA]: {
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
    // [Tokens.SNX]: {
    //   appChain: ChainSlug.LYRA_TESTNET,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.157407407407407",
    //         withdrawLimit: "1000",
    //         withdrawRate: "0.0115741",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "1000",
    //         depositRate: "0.01157407",
    //         withdrawLimit: "100",
    //         withdrawRate: "0.00115741",
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
    // [Tokens.USDT]: {
    //   appChain: ChainSlug.LYRA_TESTNET,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
    // [Tokens.WSTETH]: {
    //   appChain: ChainSlug.LYRA_TESTNET,
    //   nonAppChains: {
    //     [ChainSlug.OPTIMISM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "500",
    //         depositRate: "0.005787037",
    //         withdrawLimit: "500",
    //         withdrawRate: "0.005787037",
    //         poolCount: 0,
    //       },
    //     },
    //     [ChainSlug.SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100000",
    //         depositRate: "1.1574",
    //         withdrawLimit: "100000",
    //         withdrawRate: "1.1574",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
  },
};

export = pc;
