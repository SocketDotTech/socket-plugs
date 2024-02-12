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
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
      integrationTypes: {
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
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.SEPOLIA],
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "100000",
          depositRate: "1.1574",
          withdrawLimit: "100000",
          withdrawRate: "1.1574",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "100000",
          depositRate: "1.1574",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.LYRA_TESTNET,
      // nonAppChains: [ChainSlug.SEPOLIA, ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
      nonAppChains: [ChainSlug.SEPOLIA],
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
  },
};

export = pc;
