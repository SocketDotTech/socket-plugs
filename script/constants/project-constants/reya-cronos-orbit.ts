import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.WETH]: {
      appChain: ChainSlug.REYA_CRONOS_ORBIT,
      nativeVaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
      nonAppChains: {
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
