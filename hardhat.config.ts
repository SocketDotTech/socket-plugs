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

let liveNetworks = {};
liveNetworks = {};

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
      bsc: process.env.BSCSCAN_API_KEY || "",
      bscTestnet: process.env.BSCSCAN_API_KEY || "",
      goerli: process.env.ETHERSCAN_API_KEY || "",
      mainnet: process.env.ETHERSCAN_API_KEY || "",
      sepolia: process.env.ETHERSCAN_API_KEY || "",
      optimisticEthereum: process.env.OPTIMISM_API_KEY || "",
      optimisticTestnet: process.env.OPTIMISM_API_KEY || "",
      polygon: process.env.POLYGONSCAN_API_KEY || "",
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
        network: "arbitrumTestnet",
        chainId: hardhatChainNameToSlug[HardhatChainName.ARBITRUM_GOERLI],
        urls: {
          apiURL: "https://api-goerli.arbiscan.io/api",
          browserURL: "https://goerli.arbiscan.io/",
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: hardhatChainNameToSlug.hardhat,
    },
    [HardhatChainName.ARBITRUM_GOERLI]: getChainConfig(
      HardhatChainName.ARBITRUM_GOERLI
    ),
    [HardhatChainName.OPTIMISM_GOERLI]: getChainConfig(
      HardhatChainName.OPTIMISM_GOERLI
    ),
    [HardhatChainName.POLYGON_MAINNET]: getChainConfig(
      HardhatChainName.POLYGON_MAINNET
    ),
    [HardhatChainName.ARBITRUM]: getChainConfig(HardhatChainName.ARBITRUM),
    [HardhatChainName.BSC]: getChainConfig(HardhatChainName.BSC),
    [HardhatChainName.AEVO]: getChainConfig(HardhatChainName.AEVO),
    [HardhatChainName.GOERLI]: getChainConfig(HardhatChainName.GOERLI),
    [HardhatChainName.MAINNET]: getChainConfig(HardhatChainName.MAINNET),
    [HardhatChainName.OPTIMISM]: getChainConfig(HardhatChainName.OPTIMISM),
    [HardhatChainName.POLYGON_MUMBAI]: getChainConfig(
      HardhatChainName.POLYGON_MUMBAI
    ),
    [HardhatChainName.BSC_TESTNET]: getChainConfig(
      HardhatChainName.BSC_TESTNET
    ),
    [HardhatChainName.SEPOLIA]: getChainConfig(HardhatChainName.SEPOLIA),
    [HardhatChainName.AEVO_TESTNET]: getChainConfig(
      HardhatChainName.AEVO_TESTNET
    ),
    [HardhatChainName.LYRA_TESTNET]: getChainConfig(
      HardhatChainName.LYRA_TESTNET
    ),
    [HardhatChainName.LYRA]: getChainConfig(HardhatChainName.LYRA),
    [HardhatChainName.SX_NETWORK_TESTNET]: getChainConfig(
      HardhatChainName.SX_NETWORK_TESTNET
    ),
  },
  paths: {
    sources: "./src",
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
