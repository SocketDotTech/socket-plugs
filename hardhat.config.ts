import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-preprocessor";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-change-network";

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

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
if (!process.env.SOCKET_SIGNER_KEY) throw new Error("No private key found");
const privateKey: HardhatNetworkAccountUserConfig = process.env
  .SOCKET_SIGNER_KEY as unknown as HardhatNetworkAccountUserConfig;

function getChainConfig(chain: HardhatChainName): NetworkUserConfig {
  return {
    accounts: [`0x${privateKey}`],
    chainId: ChainSlugToId[hardhatChainNameToSlug[chain]],
    url: getJsonRpcUrl(hardhatChainNameToSlug[chain]),
  };
}

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .map((line) => line.trim().split("="));
}

const liveNetworks = [
  HardhatChainName.ARBITRUM_GOERLI,
  HardhatChainName.ARBITRUM_SEPOLIA,
  HardhatChainName.OPTIMISM_GOERLI,
  HardhatChainName.OPTIMISM_SEPOLIA,
  HardhatChainName.POLYGON_MAINNET,
  HardhatChainName.ARBITRUM,
  HardhatChainName.BSC,
  HardhatChainName.AEVO,
  HardhatChainName.GOERLI,
  HardhatChainName.MAINNET,
  HardhatChainName.OPTIMISM,
  HardhatChainName.POLYGON_MUMBAI,
  HardhatChainName.BSC_TESTNET,
  HardhatChainName.SEPOLIA,
  HardhatChainName.AEVO_TESTNET,
  HardhatChainName.LYRA_TESTNET,
  HardhatChainName.LYRA,
  HardhatChainName.SX_NETWORK_TESTNET,
  HardhatChainName.MODE_TESTNET,
  HardhatChainName.VICTION_TESTNET,
  HardhatChainName.BASE,
  HardhatChainName.MODE,
  HardhatChainName.ANCIENT8_TESTNET2,
  HardhatChainName.REYA_CRONOS_ORBIT,
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
      arbitrumTestnet: process.env.ARBISCAN_API_KEY || "",
      arbitrumSepolia: process.env.ARBISCAN_API_KEY || "",
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      optimisticTestnet: process.env.OPTIMISM_API_KEY || "",
      optimisticSepolia: process.env.OPTIMISM_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
      base: process.env.BASESCAN_API_KEY || "",
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "optimisticTestnet",
        chainId: hardhatChainNameToSlug[HardhatChainName.OPTIMISM_GOERLI],
        urls: {
          apiURL: "https://api-goerli-optimistic.etherscan.io/api",
          browserURL: "https://goerli-optimism.etherscan.io/",
        },
      },
      {
        network: "optimisticSepolia",
        chainId: hardhatChainNameToSlug[HardhatChainName.OPTIMISM_SEPOLIA],
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io/",
        },
      },
      {
        network: "arbitrumTestnet",
        chainId: hardhatChainNameToSlug[HardhatChainName.ARBITRUM_GOERLI],
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io/",
        },
      },
      {
        network: "arbitrumSepolia",
        chainId: hardhatChainNameToSlug[HardhatChainName.ARBITRUM_SEPOLIA],
        urls: {
          apiURL: "https://api-sepolia.arbiscan.io/api",
          browserURL: "https://sepolia.arbiscan.io/",
        },
      },
      {
        network: "base",
        chainId: hardhatChainNameToSlug[HardhatChainName.BASE],
        urls: {
          apiURL: "https://api.basescan.org/api",
          browserURL: "https://basescan.org/",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: hardhatChainNameToSlug.hardhat,
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
