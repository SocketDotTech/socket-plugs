import { ChainSlug } from "@socket.tech/dl-core";
import { Contract, providers, utils } from "ethers";
import { getProviderFromChainSlug } from "../helpers";
import { Hooks, ProjectType } from "../../src";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

export type ProjectConfig = {
  projectType: ProjectType;
  projectName: string;
  hookType: Hooks;
  owner: string;
  isMainnet: boolean;
  newToken?: boolean;
};

export type NewTokenInfo = {
  address: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  chainSlug?: ChainSlug;
};

type TokenRateLimits = Record<
  string,
  { sendingLimit: number; receivingLimit: number }
>;

export const validateEthereumAddress = (address: string) => {
  return utils.isAddress(address);
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
    const token = new utils.Interface([
      "function name() view returns (string)",
      "function symbol() view returns (string)",
      "function decimals() view returns (uint8)",
    ]);
    const contract = new Contract(tokenAddress, token, provider);
    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    return { name, symbol, decimals };
  } catch (error) {
    console.log("Error while fetching token metadata : ", error);
    throw error;
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
