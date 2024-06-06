import { ChainSlug } from "@socket.tech/dl-core";
import { Contract, providers, utils } from "ethers";
import {
  getProviderFromChainSlug,
  isContractAtAddress,
  rpcKeys,
} from "../helpers";
import { Hooks, ProjectType } from "../../src";
import { StaticJsonRpcProvider } from "@ethersproject/providers";
import { Tokens } from "../../src/enums";

export type ProjectConfig = {
  projectType: ProjectType;
  projectName: string;
  hookType: Hooks;
  owner: string;
  isMainnet: boolean;
  newToken?: boolean;
};

export type NewTokenInfo = {
  name: string;
  symbol: string;
  decimals: number;
  chainSlug: ChainSlug;
  address: string;
};

type TokenRateLimits = Record<
  string,
  { sendingLimit: number; receivingLimit: number }
>;

export const validateEthereumAddress = (address: string) => {
  return utils.isAddress(address);
};

export const validateEmptyValue = (data: string) => {
  const isEmpty = data == "" || data == null || data == undefined;
  return !isEmpty;
};

export const getTokenMetadata = async (
  chainSlug: ChainSlug,
  tokenAddress: string,
  rpc: string = ""
) => {
  try {
    let provider: StaticJsonRpcProvider;
    if (rpc) {
      provider = new StaticJsonRpcProvider(rpc);
    } else {
      provider = getProviderFromChainSlug(chainSlug);
    }

    const isContract = await isContractAtAddress(provider, tokenAddress);
    if (!isContract) {
      console.log(
        "\n\nInvalid token address. No contract present at the address.\n\n"
      );
      process.exit(1);
    }
    const token = new utils.Interface([
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ]);
    const contract = new Contract(tokenAddress, token, provider);
    try {
      const name = await contract.name();
      const symbol = await contract.symbol();
      const decimals = await contract.decimals();
      return { name, symbol, decimals };
    } catch (error) {
      console.log(
        "\n\nError while fetching token metadata. Check if the chain is correct and entered address is a valid token address.\n\n"
      );
      process.exit(1);
    }
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

export const validateRPC = async (chainSlug: ChainSlug, rpcUrl: string) => {
  try {
    let provider = new providers.StaticJsonRpcProvider(rpcUrl);
    let network = await provider.getNetwork();
    if (chainSlug != ChainSlug.REYA && network.chainId !== chainSlug) {
      console.log(
        `ChainId mismatch: ChainId of the network is ${network.chainId} while the expected chainId is ${chainSlug}`
      );
      return false;
    }
    return true;
  } catch (error) {
    console.log("Error while checking rpc : ", error);
    return false;
  }
};

export const initialLimitsForSuperbridge: {
  [token in Tokens]?: { sendingLimit: number; receivingLimit: number };
} = {
  [Tokens.ETH]: { sendingLimit: 10.0, receivingLimit: 10.0 },
  [Tokens.WETH]: { sendingLimit: 10.0, receivingLimit: 10.0 },
  [Tokens.WSTETH]: { sendingLimit: 10.0, receivingLimit: 10.0 },
  [Tokens.USDC]: { sendingLimit: 100_000.0, receivingLimit: 100_000.0 },
  [Tokens.USDCE]: { sendingLimit: 100_000.0, receivingLimit: 100_000.0 },
  [Tokens.USDT]: { sendingLimit: 100_000.0, receivingLimit: 100_000.0 },
  [Tokens.DAI]: { sendingLimit: 100_000.0, receivingLimit: 100_000.0 },
  [Tokens.WBTC]: { sendingLimit: 1.0, receivingLimit: 1.0 },
};
