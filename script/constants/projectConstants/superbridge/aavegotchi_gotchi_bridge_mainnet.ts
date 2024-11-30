import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { NFTs, Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [NFTs.GOTCHI]: {
      vaultChains: [ChainSlug.POLYGON_MAINNET],
      controllerChains: [ChainSlug.GEIST],
      tokenAddresses: {
        [ChainSlug.POLYGON_MAINNET]:
          "0x86935F11C86623deC8a25696E1C19a8659CbF95d",
        [ChainSlug.GEIST]: "0x6Acc828BbbC6874de40Ca20bfeA7Cd2a2DA8DA8c",
      },
      hook: {
        hookType: Hooks.NO_HOOK,
      },
    },
  },
};
