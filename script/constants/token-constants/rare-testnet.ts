import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { TokenConstants } from "../types";
import { getSocketOwner } from "../config";
import { Hooks, ProjectType } from "../../../src";

const tc: TokenConstants = {
  [DeploymentMode.PROD]: {
    superTokenChains: [ChainSlug.OPTIMISM_SEPOLIA, ChainSlug.ARBITRUM_SEPOLIA],
    vaultChains: [ChainSlug.AEVO_TESTNET],
    hook: Hooks.LIMIT_HOOK,
    projectType: ProjectType.SUPERTOKEN,
    tokenInfo: {
      name: "USDC",
      symbol: "USDC",
      decimals: 6,
      initialSupply: 1000,
      initialSupplyOwner: getSocketOwner(),
      owner: getSocketOwner(),
    },
    limits: {
      [ChainSlug.AEVO_TESTNET]: {
        [IntegrationTypes.fast]: {
          sendingLimit: "50000",
          sendingRate: "0.5787",
          receivingLimit: "50000",
          receivingRate: "0.5787",
          poolCount: 0,
        },
      },
      [ChainSlug.OPTIMISM_SEPOLIA]: {
        [IntegrationTypes.fast]: {
          sendingLimit: "50000",
          sendingRate: "0.5787",
          receivingLimit: "50000",
          receivingRate: "0.5787",
          poolCount: 0,
        },
      },
      [ChainSlug.ARBITRUM_SEPOLIA]: {
        [IntegrationTypes.fast]: {
          sendingLimit: "50000",
          sendingRate: "0.5787",
          receivingLimit: "50000",
          receivingRate: "0.5787",
          poolCount: 0,
        },
      },
    },
  },
};

export = tc;
