import { config as dotenvConfig } from "dotenv";
import { BigNumberish, Wallet, ethers } from "ethers";
import { resolve } from "path";
import { ChainSlug, ChainSlugToKey } from "@socket.tech/dl-core";
import { getSocketSignerKey } from "../constants/config";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

export const chainSlugKeys: string[] = Object.values(ChainSlugToKey);

export const gasLimit = undefined;
export const gasPrice = undefined;
export const type = 2;

export const overrides: {
  [chain in ChainSlug]?: {
    type?: number | undefined;
    gasLimit: BigNumberish | undefined;
    gasPrice: BigNumberish | undefined;
  };
} = {
  [ChainSlug.ARBITRUM_GOERLI]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.ARBITRUM_SEPOLIA]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.OPTIMISM_GOERLI]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.OPTIMISM_SEPOLIA]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.SEPOLIA]: {
    type: 1,
    gasLimit,
    gasPrice: 10_000_000_000,
  },
  [ChainSlug.AEVO_TESTNET]: {
    type,
    gasLimit,
    gasPrice,
  },
  [ChainSlug.OPTIMISM]: {
    type,
    gasLimit: 2_000_000,
    gasPrice,
  },
  [ChainSlug.ARBITRUM]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.AEVO]: {
    type: 1,
    gasLimit,
    gasPrice: 100_000_000,
  },
  [ChainSlug.LYRA_TESTNET]: {
    type: 1,
    gasLimit,
    gasPrice: 100_000_000,
  },
  [ChainSlug.LYRA]: {
    type: 1,
    gasLimit,
    gasPrice: 100_000_000,
  },
  [ChainSlug.MAINNET]: {
    type: 1,
    gasLimit: 400_000,
    gasPrice: 57_000_000_000,
  },
  [ChainSlug.SX_NETWORK_TESTNET]: {
    // type: 1,
    gasLimit: 10_000_000,
    gasPrice: 20_000_000_000,
  },
  [ChainSlug.MODE_TESTNET]: {
    type: 1,
    gasLimit: 3_000_000,
    gasPrice: 100_000_000,
  },
  [ChainSlug.VICTION_TESTNET]: {
    // type: 1,
    gasLimit: 3_000_000,
    gasPrice: 2_000_000_000,
  },
  [ChainSlug.BASE]: {
    type: 1,
    gasLimit,
    gasPrice: 10_000_000,
  },
  [ChainSlug.MODE]: {
    type: 1,
    gasLimit,
    gasPrice: 10_000_000,
  },
  [ChainSlug.ANCIENT8_TESTNET2]: {
    type: 1,
    gasLimit,
    gasPrice: 10_000_000,
  },
};

export function getJsonRpcUrl(chain: ChainSlug): string {
  switch (chain) {
    case ChainSlug.ARBITRUM:
      if (!process.env.ARBITRUM_RPC)
        throw new Error("ARBITRUM_RPC not configured");
      return process.env.ARBITRUM_RPC;

    case ChainSlug.ARBITRUM_GOERLI:
      if (!process.env.ARB_GOERLI_RPC)
        throw new Error("ARB_GOERLI_RPC not configured");
      return process.env.ARB_GOERLI_RPC;

    case ChainSlug.ARBITRUM_SEPOLIA:
      if (!process.env.ARB_SEPOLIA_RPC)
        throw new Error("ARB_SEPOLIA_RPC not configured");
      return process.env.ARB_SEPOLIA_RPC;

    case ChainSlug.OPTIMISM:
      if (!process.env.OPTIMISM_RPC)
        throw new Error("OPTIMISM_RPC not configured");
      return process.env.OPTIMISM_RPC;

    case ChainSlug.OPTIMISM_GOERLI:
      if (!process.env.OPTIMISM_GOERLI_RPC)
        throw new Error("OPTIMISM_GOERLI_RPC not configured");
      return process.env.OPTIMISM_GOERLI_RPC;

    case ChainSlug.OPTIMISM_SEPOLIA:
      if (!process.env.OPTIMISM_SEPOLIA_RPC)
        throw new Error("OPTIMISM_SEPOLIA_RPC not configured");
      return process.env.OPTIMISM_SEPOLIA_RPC;

    case ChainSlug.POLYGON_MAINNET:
      if (!process.env.POLYGON_RPC)
        throw new Error("POLYGON_RPC not configured");
      return process.env.POLYGON_RPC;

    case ChainSlug.POLYGON_MUMBAI:
      if (!process.env.POLYGON_MUMBAI_RPC)
        throw new Error("POLYGON_MUMBAI_RPC not configured");
      return process.env.POLYGON_MUMBAI_RPC;

    case ChainSlug.BSC:
      if (!process.env.BSC_RPC) throw new Error("BSC_RPC not configured");
      return process.env.BSC_RPC;

    case ChainSlug.BSC_TESTNET:
      if (!process.env.BSC_TESTNET_RPC)
        throw new Error("BSC_TESTNET_RPC not configured");
      return process.env.BSC_TESTNET_RPC;

    case ChainSlug.MAINNET:
      if (!process.env.ETHEREUM_RPC)
        throw new Error("ETHEREUM_RPC not configured");
      return process.env.ETHEREUM_RPC;

    case ChainSlug.GOERLI:
      if (!process.env.GOERLI_RPC) throw new Error("GOERLI_RPC not configured");
      return process.env.GOERLI_RPC;

    case ChainSlug.SEPOLIA:
      if (!process.env.SEPOLIA_RPC)
        throw new Error("SEPOLIA_RPC not configured");
      return process.env.SEPOLIA_RPC;

    case ChainSlug.AEVO_TESTNET:
      if (!process.env.AEVO_TESTNET_RPC)
        throw new Error("AEVO_TESTNET_RPC not configured");
      return process.env.AEVO_TESTNET_RPC;

    case ChainSlug.AEVO:
      if (!process.env.AEVO_RPC) throw new Error("AEVO_RPC not configured");
      return process.env.AEVO_RPC;

    case ChainSlug.LYRA_TESTNET:
      if (!process.env.LYRA_TESTNET_RPC)
        throw new Error("LYRA_TESTNET_RPC not configured");
      return process.env.LYRA_TESTNET_RPC;

    case ChainSlug.LYRA:
      if (!process.env.LYRA_RPC) throw new Error("LYRA_RPC not configured");
      return process.env.LYRA_RPC;

    case ChainSlug.SX_NETWORK_TESTNET:
      if (!process.env.SX_NETWORK_TESTNET_RPC)
        throw new Error("SX_NETWORK_TESTNET_RPC not configured");
      return process.env.SX_NETWORK_TESTNET_RPC;

    case ChainSlug.MODE_TESTNET:
      if (!process.env.MODE_TESTNET_RPC)
        throw new Error("MODE_TESTNET_RPC not configured");
      return process.env.MODE_TESTNET_RPC;

    case ChainSlug.VICTION_TESTNET:
      if (!process.env.VICTION_TESTNET_RPC)
        throw new Error("VICTION_TESTNET_RPC not configured");
      return process.env.VICTION_TESTNET_RPC;

    case ChainSlug.BASE:
      if (!process.env.BASE_RPC) throw new Error("BASE_RPC not configured");
      return process.env.BASE_RPC;

    case ChainSlug.MODE:
      if (!process.env.MODE_RPC) throw new Error("MODE_RPC not configured");
      return process.env.MODE_RPC;

    case ChainSlug.ANCIENT8_TESTNET2:
      if (!process.env.ANCIENT8_TESTNET2_RPC)
        throw new Error("ANCIENT8_TESTNET2_RPC not configured");
      return process.env.ANCIENT8_TESTNET2_RPC;

    case ChainSlug.HARDHAT:
      return "http://127.0.0.1:8545/";

    default:
      throw new Error(`Chain RPC not supported ${chain}`);
  }
}

export const getProviderFromChainSlug = (
  chainSlug: ChainSlug
): ethers.providers.StaticJsonRpcProvider => {
  const jsonRpcUrl = getJsonRpcUrl(chainSlug);
  return new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl);
};

export const getSignerFromChainSlug = (chainSlug: ChainSlug): Wallet => {
  return new Wallet(getSocketSignerKey(), getProviderFromChainSlug(chainSlug));
};
