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
      nonAppChains: [ChainSlug.OPTIMISM_SEPOLIA],
      //   nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
      appChain: ChainSlug.AEVO_TESTNET,
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      projectType: ProjectType.SUPERBRIDGE,
      limits: {
        // [ChainSlug.ARBITRUM_SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     sendingLimit: "50000",
        //     sendingRate: "0.5787",
        //     receivingLimit: "50000",
        //     receivingRate: "0.5787",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
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
