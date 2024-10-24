import { config as dotenvConfig } from "dotenv";
import { BigNumberish, Wallet, ethers } from "ethers";
import { resolve } from "path";
import {
  ChainSlug,
  ChainSlugToKey,
  DeploymentMode,
} from "@socket.tech/dl-core";
import { getMode, getOwnerSignerKey } from "../constants/config";
import { chainSlugReverseMap } from "../setup/enumMaps";
import { chains, getChainName } from "../constants";
import { Overrides } from "../../src";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

export const chainSlugKeys: string[] = Object.values(ChainSlugToKey);

export const gasLimit = undefined;
export const gasPrice = undefined;
export const type = 2;

export const overrides: {
  [chain: number]: Overrides;
} = {
  [ChainSlug.ARBITRUM_SEPOLIA]: {
    type,
    // gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.OPTIMISM_SEPOLIA]: {
    type,
    // gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.SEPOLIA]: {
    type: 0,
    gasLimit,
    gasPrice: 25_000_000_000,
  },
  [ChainSlug.AEVO_TESTNET]: {
    type,
    gasLimit,
    gasPrice,
  },
  [ChainSlug.OPTIMISM]: {
    type,
    // gasLimit: 2_000_000,
    gasPrice,
  },
  [ChainSlug.ARBITRUM]: {
    // type,
    // gasLimit: 2_000_000,
    // gasPrice,
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
    gasLimit: 4_000_000,
    gasPrice: 40_000_000_000,
  },
  [ChainSlug.SX_NETWORK_TESTNET]: {
    // type: 1,
    gasLimit: 10_000_000,
    gasPrice,
  },
  [ChainSlug.POLYGON_MAINNET]: {
    // type: 1,
    // gasLimit: 1_000_000,
    // gasPrice: 50_000_000_000,
  },
  [ChainSlug.BSC]: {
    // type: 1,
    // gasLimit: 1_000_000,
    // gasPrice: 10_000_000_000,
  },
  [ChainSlug.BASE]: {
    // type: 1,
    // gasLimit: 5_000_000,
    // gasPrice,
  },
  [ChainSlug.REYA_CRONOS]: {
    type: 1,
    // gasLimit,
    gasPrice: 100_000_000,
  },
  [ChainSlug.SYNDR_SEPOLIA_L3]: {
    type: 2,
    gasLimit: 400_000_000,
    // gasPrice: 1_000_000_000,
  },
  [ChainSlug.REYA]: {
    type: 1,
    gasLimit: 1_000_000_000,
    gasPrice: 100_000,
  },
};

export const getOverrides = (chainSlug: ChainSlug): Overrides => {
  // First check from the overrides object. Prod chains config should be here.
  if (overrides[chainSlug]) return overrides[chainSlug];

  // If not present, check from the chains object. Test chains config should be here
  if (chains?.[chainSlug]?.overrides) {
    return chains[chainSlug].overrides;
  }

  // return the default values defined above
  return {
    type,
    gasLimit,
    gasPrice,
  };
};

export const rpcKeys = (chainSlug: ChainSlug) => {
  const chainName = getChainName(chainSlug);
  return chainName ? `${chainName}_RPC` : "";
};

export function getJsonRpcUrl(chain: ChainSlug): string {
  let chainRpcKey = rpcKeys(chain);
  if (!chainRpcKey) throw Error(`Chain ${chain} not found in rpcKey`);
  let rpc = process.env[chainRpcKey];
  if (!rpc) {
    throw new Error(
      `RPC not configured for chain ${chain}. Missing env variable : ${rpcKeys(
        chain
      )}`
    );
  }
  return rpc;
}

export const getProviderFromChainSlug = (
  chainSlug: ChainSlug
): ethers.providers.StaticJsonRpcProvider => {
  const jsonRpcUrl = getJsonRpcUrl(chainSlug);
  return new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl);
};

export const getSignerFromChainSlug = (chainSlug: ChainSlug): Wallet => {
  return new Wallet(getOwnerSignerKey(), getProviderFromChainSlug(chainSlug));
};
