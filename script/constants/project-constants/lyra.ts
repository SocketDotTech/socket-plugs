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
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.MAINNET],
      isFiatTokenV2_1: true,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "10000000",
          // depositRate: "10000000",
          depositRate: "115.74",
          withdrawLimit: "1000000",
          // withdrawRate: "1000000",
          withdrawRate: "11.574",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "10000000",
          // depositRate: "10000000",
          depositRate: "115.74",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
  },
};

export = pc;
