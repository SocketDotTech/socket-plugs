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
      appChain: ChainSlug.MODE,
      nonAppChains: [ChainSlug.OPTIMISM, ChainSlug.ARBITRUM, ChainSlug.BASE],
      isFiatTokenV2_1: true,
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
};

export = pc;
