import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens, Project } from "./types";
import { BigNumber, utils } from "ethers";

if (!process.env.SOCKET_OWNER_ADDRESS)
  throw Error("Socket owner address not present");
export const socketOwner = process.env.SOCKET_OWNER_ADDRESS;

if (!process.env.SOCKET_SIGNER_KEY)
  throw Error("Socket signer key not present");
export const socketSignerKey = process.env.SOCKET_SIGNER_KEY;

if (!process.env.DEPLOYMENT_MODE)
  throw new Error("DeploymentMode not mentioned");
if (
  !Object.values(DeploymentMode).includes(
    process.env.DEPLOYMENT_MODE as DeploymentMode
  )
)
  throw new Error("DeploymentMode is invalid");
export const mode: DeploymentMode = process.env
  .DEPLOYMENT_MODE as DeploymentMode;

if (!process.env.PROJECT) throw new Error("Project not mentioned");
if (!Object.values(Project).includes(process.env.PROJECT as Project))
  throw new Error("Project is invalid");
export const project: Project = process.env.PROJECT as Project;

console.log("========================================================");
console.log("MODE", mode);
console.log("PROJECT", project);
console.log(
  `Make sure ${mode}_${project}_addresses.json and ${mode}_${project}_verification.json is cleared for given networks if redeploying!!`
);
console.log(`Owner address configured to ${socketOwner}`);
console.log("========================================================");

export type ProjectConstants = {
  [key in Project]: {
    [key in DeploymentMode]?: {
      appChain: ChainSlug;
      nonAppChains: ChainSlug[];
      tokenToBridge: Tokens;
      integrationTypes: {
        [key in IntegrationTypes]?: {
          limit: string;
          rate: string;
          poolCount:number;
        };
      };
    };
  };
};

const _projectConstants: ProjectConstants = {
  [Project.AEVO]: {
    [DeploymentMode.DEV]: {
      appChain: ChainSlug.AEVO_TESTNET,
      nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          limit: "50000",
          rate: "0.5787",
          poolCount:0
        },
      },
    },
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.AEVO,
      nonAppChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          limit: "50000",
          rate: "0.5787",
          poolCount:0
        },
      },
    },
  },
  [Project.LYRA]: {
    [DeploymentMode.DEV]: {
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          limit: "10000",
          rate: "0.11574",
          poolCount:0
        },
      },
    },
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          limit: "10000",
          rate: "0.11574",
          poolCount:0
        },
      },
    },
  },
};

export const isAppChain = (chain: ChainSlug) =>
  projectConstants.appChain === chain;

export const tokenName = {
  [Tokens.Moon]: "Moon",
  [Tokens.USDC]: "USD coin",
};

export const tokenSymbol = {
  [Tokens.Moon]: "MOON",
  [Tokens.USDC]: "USDC",
};

export const tokenDecimals = {
  [Tokens.Moon]: 18,
  [Tokens.USDC]: 6,
};

export const projectConstants = (() => {
  const pc = _projectConstants[project][mode];
  if (!pc) throw new Error("invalid mode for project");
  return pc;
})();

export const getIntegrationTypeConsts = (it: IntegrationTypes) => {
  const pci = projectConstants.integrationTypes[it];
  if (!pci) throw new Error("invalid integration for mode and project");
  return pci;
};

export const getLimitBN = (it: IntegrationTypes): BigNumber => {
  return utils.parseUnits(
    getIntegrationTypeConsts(it).limit,
    tokenDecimals[projectConstants.tokenToBridge]
  );
};

export const getRateBN = (it: IntegrationTypes): BigNumber => {
  return utils.parseUnits(
    getIntegrationTypeConsts(it).rate,
    tokenDecimals[projectConstants.tokenToBridge]
  );
};

export const integrationTypes: IntegrationTypes = Object.keys(
  projectConstants.integrationTypes
) as unknown as IntegrationTypes;
