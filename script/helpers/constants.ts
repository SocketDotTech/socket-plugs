import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { BigNumber, utils } from "ethers";
import { Project, Tokens } from "../../src";

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
          depositLimit: string;
          depositRate: string;
          withdrawLimit: string;
          withdrawRate: string;
          poolCount: number;
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
          depositLimit: "50000",
          depositRate: "0.5787",
          withdrawLimit: "50000",
          withdrawRate: "0.5787",
          poolCount: 0,
        },
      },
    },
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.AEVO,
      nonAppChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "200000",
          depositRate: "2.3148",
          withdrawLimit: "200000",
          withdrawRate: "2.3148",
          poolCount: 0,
        },
      },
    },
  },
  [Project.LYRA_TESTNET]: {
    [DeploymentMode.DEV]: {
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "10000",
          depositRate: "0.11574",
          withdrawLimit: "10000",
          withdrawRate: "0.11574",
          poolCount: 0,
        },
      },
    },
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.LYRA_TESTNET,
      nonAppChains: [ChainSlug.SEPOLIA],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "0",
          depositRate: "0",
          withdrawLimit: "10000",
          withdrawRate: "0.11574",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "10000",
          depositRate: "0.11574",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
  },
  [Project.LYRA]: {
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.MAINNET],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "0",
          depositRate: "0",
          withdrawLimit: "10000",
          withdrawRate: "0.11574",
          poolCount: 0,
        },
        [IntegrationTypes.native]: {
          depositLimit: "10000",
          depositRate: "0.11574",
          withdrawLimit: "0",
          withdrawRate: "0",
          poolCount: 0,
        },
      },
    },
  },
  [Project.SX_NETWORK_TESTNET]: {
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.SX_NETWORK_TESTNET,
      nonAppChains: [ChainSlug.POLYGON_MUMBAI, ChainSlug.SEPOLIA],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          depositLimit: "10000",
          depositRate: "0.11574",
          withdrawLimit: "10000",
          withdrawRate: "0.11574",
          poolCount: 0,
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

export const getLimitBN = (
  it: IntegrationTypes,
  isDeposit: boolean
): BigNumber => {
  if (isDeposit) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).depositLimit,
      tokenDecimals[projectConstants.tokenToBridge]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).withdrawLimit,
      tokenDecimals[projectConstants.tokenToBridge]
    );
  }
};

export const getRateBN = (
  it: IntegrationTypes,
  isDeposit: boolean
): BigNumber => {
  if (isDeposit) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).depositRate,
      tokenDecimals[projectConstants.tokenToBridge]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).withdrawRate,
      tokenDecimals[projectConstants.tokenToBridge]
    );
  }
};

export const integrationTypes: IntegrationTypes = Object.keys(
  projectConstants.integrationTypes
) as unknown as IntegrationTypes;
