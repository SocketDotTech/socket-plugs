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

// let projectConstants.chains: ChainSlug[];
// const projectConstants: { chains?: ChainSlug[] } = {};
// if (project == Project.AEVO) {
//   if (mode === DeploymentMode.DEV) {
//     projectConstants.chains = [
//       ChainSlug.ARBITRUM_GOERLI,
//       ChainSlug.OPTIMISM_GOERLI,
//       ChainSlug.AEVO_TESTNET,
//     ];
//   } else if (mode == DeploymentMode.PROD) {
//     projectConstants.chains = [
//       ChainSlug.ARBITRUM,
//       ChainSlug.OPTIMISM,
//       ChainSlug.AEVO,
//     ];
//   } else {
//     throw new Error("Wrong mode for aevo");
//   }
// } else if (project === Project.LYRA) {
//   if (mode === DeploymentMode.DEV) {
//     projectConstants.chains = [
//       ChainSlug.ARBITRUM_GOERLI,
//       ChainSlug.OPTIMISM_GOERLI,
//       ChainSlug.LYRA_TESTNET,
//     ];
//   } else {
//     throw new Error("Wrong mode for lyra");
//   }
// } else {
//   throw new Error("Wrong project");
// }

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
          limit: "50000",
          rate: "0.5787",
        },
      },
    },
    [DeploymentMode.PROD]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
      tokenToBridge: Tokens.USDC,
      integrationTypes: {
        [IntegrationTypes.fast]: {
          limit: "50000",
          rate: "0.5787",
        },
      },
    },
  },
};

// export const chains: ChainSlug[] = projectConstants.chains;

export const isAppChain = (chain: ChainSlug) =>
  projectConstants.appChain === chain;

// export const integrationTypes = [
//   IntegrationTypes.fast,
//   // IntegrationTypes.optimistic,
// ];

// export const tokenToBridge: Tokens = Tokens.USDC;

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

// export const totalSupply = utils.parseUnits(
//   "1000000000",
//   tokenDecimals[tokenToBridge]
// );

// export const FAST_MAX_LIMIT = utils.parseUnits(
//   "50000",
//   tokenDecimals[tokenToBridge]
// );
// export const SLOW_MAX_LIMIT = utils.parseUnits(
//   "500",
//   tokenDecimals[tokenToBridge]
// );

// export const FAST_RATE = utils.parseUnits(
//   "0.5787",
//   // "50000",
//   tokenDecimals[tokenToBridge]
// );
// export const SLOW_RATE = utils.parseUnits("2", tokenDecimals[tokenToBridge]);

export const getProjetConstants = () => {
  const pc = _projectConstants[project][mode];
  if (!pc) throw new Error("invalid mode for project");
  return pc;
};
export const projectConstants = getProjetConstants();

export const getIntegrationTypeConsts = (it: IntegrationTypes) => {
  const pci = projectConstants.integrationTypes[it];
  if (!pci) throw new Error("invalid integration for mode and project");
  return pci;
};

export const getLimitBN = (it: IntegrationTypes): BigNumber => {
  return utils.parseUnits(
    getIntegrationTypeConsts(it).limit,
    tokenDecimals[getProjetConstants().tokenToBridge]
  );
};

export const getRateBN = (it: IntegrationTypes): BigNumber => {
  return utils.parseUnits(
    getIntegrationTypeConsts(it).rate,
    tokenDecimals[getProjetConstants().tokenToBridge]
  );
};

export const integrationTypes: IntegrationTypes = Object.keys(
  projectConstants.integrationTypes
) as unknown as IntegrationTypes;
