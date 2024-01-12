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
      appChain: ChainSlug.ANCIENT8_TESTNET2,
      nonAppChains: [ChainSlug.OPTIMISM_SEPOLIA, ChainSlug.ARBITRUM_SEPOLIA],
      isFiatTokenV2_1: true,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "100000",
          depositRate: "1.1574",
          withdrawLimit: "100000",
          withdrawRate: "1.1574",
          poolCount: 0,
        },
      },
    },
  },
};

export = pc;
