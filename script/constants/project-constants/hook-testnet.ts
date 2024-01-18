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
      appChain: ChainSlug.HOOK_TESTNET,
      nonAppChains: [ChainSlug.OPTIMISM_SEPOLIA, ChainSlug.ARBITRUM_SEPOLIA],
      isFiatTokenV2_1: false,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "1000000",
          depositRate: "11.574",
          withdrawLimit: "1000000",
          withdrawRate: "11.574",
          poolCount: 0,
        },
      },
    },
  },
};

export = pc;
