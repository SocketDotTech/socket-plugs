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
      isFiatTokenV2_1: true,
      appChain: ChainSlug.MODE,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
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
  },
};

export = pc;
