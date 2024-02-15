import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.DEV]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.AEVO_TESTNET,
      nonAppChains: {
        [ChainSlug.ARBITRUM_GOERLI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "50000",
            depositRate: "0.5787",
            withdrawLimit: "50000",
            withdrawRate: "0.5787",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "50000",
            depositRate: "0.5787",
            withdrawLimit: "50000",
            withdrawRate: "0.5787",
            poolCount: 0,
          },
        },
      },
    },
  },
  [DeploymentMode.PROD]: {
    [Tokens.USDCE]: {
      appChain: ChainSlug.AEVO,
      nonAppChains: {
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000000",
            depositRate: "57.87",
            withdrawLimit: "5000000",
            withdrawRate: "57.87",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000000",
            depositRate: "57.87",
            withdrawLimit: "5000000",
            withdrawRate: "57.87",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.USDC]: {
      appChain: ChainSlug.AEVO,
      nonAppChains: {
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000000",
            depositRate: "57.87",
            withdrawLimit: "5000000",
            withdrawRate: "57.87",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000000",
            depositRate: "57.87",
            withdrawLimit: "5000000",
            withdrawRate: "57.87",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.AEVO,
      nonAppChains: {
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "2000",
            depositRate: "0.02314815",
            withdrawLimit: "2000",
            withdrawRate: "0.02314815",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "2000",
            depositRate: "0.02314815",
            withdrawLimit: "2000",
            withdrawRate: "0.02314815",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
