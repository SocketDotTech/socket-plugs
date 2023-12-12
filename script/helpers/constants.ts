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

if (!process.env.TOKEN) throw new Error("Token not mentioned");
if (!Object.values(Tokens).includes(process.env.TOKEN as Tokens))
  throw new Error("Token is invalid");
export const token: Tokens = process.env.TOKEN as Tokens;

console.log("========================================================");
console.log("MODE", mode);
console.log("PROJECT", project);
console.log("TOKEN", token);
console.log(
  `Make sure ${mode}_${project}_addresses.json and ${mode}_${project}_verification.json is cleared for given networks if redeploying!!`
);
console.log(`Owner address configured to ${socketOwner}`);
console.log("========================================================");

export type ProjectConstants = {
  [key in Project]?: {
    [key in DeploymentMode]?: {
      [key in Tokens]?: {
        appChain: ChainSlug;
        nonAppChains: ChainSlug[];
        isFiatTokenV2_1?: boolean;
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
};

const _projectConstants: ProjectConstants = {
  [Project.AEVO_TESTNET]: {
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.AEVO_TESTNET,
        nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
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
      [Tokens.WETH]: {
        appChain: ChainSlug.AEVO_TESTNET,
        nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
        integrationTypes: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.0011574",
            withdrawLimit: "100",
            withdrawRate: "0.0011574",
            poolCount: 0,
          },
        },
      },
    },
  },
  [Project.AEVO]: {
    [DeploymentMode.DEV]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.AEVO_TESTNET,
        nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
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
    },
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.AEVO,
        nonAppChains: [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM],
        integrationTypes: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000000",
            // depositRate: "5000000",
            depositRate: "57.87",
            withdrawLimit: "5000000",
            // withdrawRate: "5000000",
            withdrawRate: "57.87",
            poolCount: 0,
          },
        },
      },
    },
  },
  [Project.LYRA_TESTNET]: {
    [DeploymentMode.DEV]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.LYRA_TESTNET,
        nonAppChains: [ChainSlug.ARBITRUM_GOERLI, ChainSlug.OPTIMISM_GOERLI],
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
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.LYRA_TESTNET,
        nonAppChains: [ChainSlug.SEPOLIA],
        integrationTypes: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
  },
  [Project.LYRA]: {
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
  },
  [Project.SX_NETWORK_TESTNET]: {
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.SX_NETWORK_TESTNET,
        nonAppChains: [ChainSlug.POLYGON_MUMBAI, ChainSlug.SEPOLIA],
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
  },
  [Project.SOCKET_DEV]: {
    [DeploymentMode.DEV]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.OPTIMISM_SEPOLIA,
        nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA],
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
  },
  [Project.MODE_TESTNET]: {
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.MODE_TESTNET,
        nonAppChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
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
  },
  [Project.VICTION_TESTNET]: {
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        appChain: ChainSlug.VICTION_TESTNET,
        nonAppChains: [ChainSlug.SEPOLIA],
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
  },
};

export const isAppChain = (chain: ChainSlug) =>
  projectConstants.appChain === chain;

export const tokenName: { [key in Tokens]: string } = {
  [Tokens.Moon]: "Moon",
  [Tokens.USDC]: "USD coin",
  [Tokens.WETH]: "Wrapped Ether",
};

export const tokenSymbol: { [key in Tokens]: string } = {
  [Tokens.Moon]: "MOON",
  [Tokens.USDC]: "USDC",
  [Tokens.WETH]: "WETH",
};

export const tokenDecimals: { [key in Tokens]: number } = {
  [Tokens.Moon]: 18,
  [Tokens.USDC]: 6,
  [Tokens.WETH]: 18,
};

export const projectConstants = (() => {
  const pc = _projectConstants?.[project]?.[mode]?.[token];
  if (!pc)
    throw new Error(`config not found for ${project}, ${mode}, ${token}`);
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
      tokenDecimals[token]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).withdrawLimit,
      tokenDecimals[token]
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
      tokenDecimals[token]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it).withdrawRate,
      tokenDecimals[token]
    );
  }
};

export const integrationTypes: IntegrationTypes = Object.keys(
  projectConstants.integrationTypes
) as unknown as IntegrationTypes;
