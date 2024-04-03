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
            depositLimit: "7000000",
            depositRate: "81.018",
            withdrawLimit: "7000000",
            withdrawRate: "81.018",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "7000000",
            depositRate: "81.018",
            withdrawLimit: "7000000",
            withdrawRate: "81.018",
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
            depositLimit: "7000000",
            depositRate: "81.018",
            withdrawLimit: "7000000",
            withdrawRate: "81.018",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "7000000",
            depositRate: "81.018",
            withdrawLimit: "7000000",
            withdrawRate: "81.018",
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
            depositLimit: "1250",
            depositRate: "0.0144676",
            withdrawLimit: "250",
            withdrawRate: "0.00289352",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "1250",
            depositRate: "0.0144676",
            withdrawLimit: "250",
            withdrawRate: "0.00289352",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
