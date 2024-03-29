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
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
