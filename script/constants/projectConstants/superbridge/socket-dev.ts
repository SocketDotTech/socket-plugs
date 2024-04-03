import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.DEV]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.OPTIMISM_SEPOLIA,
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.OPTIMISM_SEPOLIA,
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.0011574",
            withdrawLimit: "100",
            withdrawRate: "0.0011574",
            poolCount: 0,
          },
        },
      },
    },
  },
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.OPTIMISM_SEPOLIA,
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
          [IntegrationTypes.optimistic]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        [ChainSlug.MODE_TESTNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
      },
    },
    // [Tokens.WETH]: {
    //   appChain: ChainSlug.OPTIMISM_SEPOLIA,
    //   nonAppChains: {
    //     [ChainSlug.ARBITRUM_SEPOLIA]: {
    //       [IntegrationTypes.fast]: {
    //         depositLimit: "100",
    //         depositRate: "0.0011574",
    //         withdrawLimit: "100",
    //         withdrawRate: "0.0011574",
    //         poolCount: 0,
    //       },
    //     },
    //   },
    // },
  },
};

export = pc;
