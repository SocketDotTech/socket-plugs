import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens, NFTs } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.SURGE]: {
    [NFTs.GOTCHI]: {
      vaultChains: [80002],
      controllerChains: [398274],
      tokenAddresses: {
        80002: "0xC80DB01aeDAD5F6E3088c75F60E52f579Cf1D3Cb",
        398274: "0x6b54b36A54b068152f0f39FdA0Bf96e02176D95B",
      },
      hook: {
        hookType: Hooks.NO_HOOK,
      },
    },
  },
};
