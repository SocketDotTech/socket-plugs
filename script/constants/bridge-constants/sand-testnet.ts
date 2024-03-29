import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectType, Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA],
      //   nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
      appChain: ChainSlug.AEVO_TESTNET,
      hook: Hooks.LIMIT_HOOK,
      projectType: ProjectType.SUPERBRIDGE,
      limits: {
        [ChainSlug.AEVO_TESTNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "50000",
            sendingRate: "0.5787",
            receivingLimit: "50000",
            receivingRate: "0.5787",
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "50000",
            sendingRate: "0.5787",
            receivingLimit: "50000",
            receivingRate: "0.5787",
            poolCount: 1,
          },
        },
      },
    },
  },
};

export = pc;
