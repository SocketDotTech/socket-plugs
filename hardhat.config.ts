import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-preprocessor";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-change-network";

import "@nomicfoundation/hardhat-foundry";

import { config as dotenvConfig } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import type {
  HardhatNetworkAccountUserConfig,
  NetworkUserConfig,
} from "hardhat/types";
import { resolve } from "path";
import fs from "fs";

import {
  ChainSlugToId,
  HardhatChainName,
  hardhatChainNameToSlug,
} from "@socket.tech/dl-core";
import { getJsonRpcUrl } from "./script/helpers/networks";
import { constants } from "ethers";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
// if (!process.env.OWNER_SIGNER_KEY) throw new Error("No private key found");
const privateKey: HardhatNetworkAccountUserConfig = (process.env
  .OWNER_SIGNER_KEY ||
  constants.HashZero.slice(2)) as unknown as HardhatNetworkAccountUserConfig;

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .map((line) => line.trim().split("="));
}

export enum CustomNetworks {
  POLTER_DEVNET = "polter_devnet",
}

export const CustomNetworksConfig = {
  [CustomNetworks.POLTER_DEVNET]: {
    chainId: 398274,
    url: process.env.POLTER_DEVNET_RPC || "none",
    accounts: [`0x${privateKey}`],
  },
};

function getChainConfig(chain: string): NetworkUserConfig {
  return (
    CustomNetworksConfig[chain] ?? {
      accounts: [`0x${privateKey}`],
      chainId: ChainSlugToId[hardhatChainNameToSlug[chain]],
      url: getJsonRpcUrl(hardhatChainNameToSlug[chain]),
    }
  );
}

const liveNetworks = [
  HardhatChainName.ARBITRUM_SEPOLIA,
  HardhatChainName.OPTIMISM_SEPOLIA,
  HardhatChainName.POLYGON_MAINNET,
  HardhatChainName.ARBITRUM,
  HardhatChainName.BSC,
  HardhatChainName.AEVO,
  HardhatChainName.MAINNET,
  HardhatChainName.OPTIMISM,
  HardhatChainName.BSC_TESTNET,
  HardhatChainName.SEPOLIA,
  HardhatChainName.AEVO_TESTNET,
  HardhatChainName.LYRA_TESTNET,
  HardhatChainName.LYRA,
  HardhatChainName.SX_NETWORK_TESTNET,
  HardhatChainName.BASE,
  HardhatChainName.REYA_CRONOS,
  HardhatChainName.REYA,
  HardhatChainName.SYNDR_SEPOLIA_L3,
  CustomNetworks.POLTER_DEVNET,
];

let hardhatNetworkDetails = {};
liveNetworks.forEach((n) => {
  try {
    hardhatNetworkDetails[n] = getChainConfig(n);
  } catch (e) {}
});

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  abiExporter: {
    path: "artifacts/abi",
    flat: true,
  },
  etherscan: {
    apiKey: {
      arbitrumOne: process.env.ARBISCAN_API_KEY || "",
      [HardhatChainName.ARBITRUM_SEPOLIA]: process.env.ARBISCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      [HardhatChainName.OPTIMISM_SEPOLIA]: process.env.OPTIMISM_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      [HardhatChainName.BASE]: process.env.BASESCAN_API_KEY || "",
      [HardhatChainName.LYRA]: "none",
      [HardhatChainName.LYRA_TESTNET]: "none",
      [HardhatChainName.REYA_CRONOS]: "none",
      [HardhatChainName.REYA]: "none",
      [HardhatChainName.AEVO]: "none",
      [CustomNetworks.POLTER_DEVNET]: "none",
    },
    // Custom chains for verification. These are only for verification to work. The hardhat etherscan plugin does not support these chains.
    customChains: [
      {
        network: HardhatChainName.OPTIMISM_SEPOLIA,
        chainId:
          ChainSlugToId[
            hardhatChainNameToSlug[HardhatChainName.OPTIMISM_SEPOLIA]
          ],
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io/",
        },
      },
      {
        network: HardhatChainName.ARBITRUM_SEPOLIA,
        chainId:
          ChainSlugToId[
            hardhatChainNameToSlug[HardhatChainName.ARBITRUM_SEPOLIA]
          ],
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: HardhatChainName.BASE,
        chainId: ChainSlugToId[hardhatChainNameToSlug[HardhatChainName.BASE]],
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
      {
        network: HardhatChainName.LYRA,
        chainId: ChainSlugToId[hardhatChainNameToSlug[HardhatChainName.LYRA]],
        urls: {
          apiURL: "https://explorer.lyra.finance/api",
          browserURL: "https://explorer.lyra.finance",
        },
      },
      {
        network: HardhatChainName.LYRA_TESTNET,
        chainId:
          ChainSlugToId[hardhatChainNameToSlug[HardhatChainName.LYRA_TESTNET]],
        urls: {
          apiURL:
            "https://explorerl2new-prod-testnet-0eakp60405.t.conduit.xyz/api",
          browserURL:
            "https://explorerl2new-prod-testnet-0eakp60405.t.conduit.xyz/",
        },
      },
      {
        network: HardhatChainName.REYA_CRONOS,
        chainId:
          ChainSlugToId[hardhatChainNameToSlug[HardhatChainName.REYA_CRONOS]],
        urls: {
          apiURL: "https://reya-cronos.blockscout.com/api",
          browserURL: "https://reya-cronos.blockscout.com/",
        },
      },
      {
        network: HardhatChainName.REYA,
        chainId: ChainSlugToId[hardhatChainNameToSlug[HardhatChainName.REYA]],
        urls: {
          apiURL: "https://explorer.reya.network/api",
          browserURL: "https://explorer.reya.network/",
        },
      },
      {
        network: HardhatChainName.AEVO,
        chainId: hardhatChainNameToSlug[HardhatChainName.AEVO],
        urls: {
          apiURL: "https://explorer.aevo.xyz/api",
          browserURL: "https://explorer.aevo.xyz/",
        },
      },
      {
        network: CustomNetworks.POLTER_DEVNET,
        chainId: CustomNetworksConfig[CustomNetworks.POLTER_DEVNET].chainId,
        urls: {
          apiURL: "https://polter-sepolia-explorer-be.devnet.alchemy.com/api",
          browserURL: "https://polter-sepolia-explorer.devnet.alchemy.com/",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: ChainSlugToId[hardhatChainNameToSlug.hardhat],
    },
    ...hardhatNetworkDetails,
  },
  paths: {
    sources: "./contracts",
    cache: "./cache_hardhat",
    artifacts: "./artifacts",
    tests: "./test",
  },
  // This fully resolves paths for imports in the ./lib directory for Hardhat
  preprocess: {
    eachLine: (hre) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          getRemappings().forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace);
            }
          });
        }
        return line;
      },
    }),
  },
  solidity: {
    version: "0.8.13",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
};

export default config;
