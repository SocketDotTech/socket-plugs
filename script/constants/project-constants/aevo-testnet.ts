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
      appChain: ChainSlug.AEVO_TESTNET,
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
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
    [Tokens.WETH]: {
      appChain: ChainSlug.AEVO_TESTNET,
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
        [ChainSlug.OPTIMISM_SEPOLIA]: {
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
};

export = pc;
