import prompts from "prompts";
import { appendToEnvFile, updateTokenEnums } from "./configUtils";
import { ChainSlug, MainnetIds, TestnetIds } from "@socket.tech/dl-core";
import { ExistingTokenAddresses, Tokens } from "../../src/enums";
import { generateTokenAddressesFile } from "./updateExistingTokenAddresses";
import {
  NewTokenInfo,
  getTokenMetadata,
  validateEthereumAddress,
  validateRPC,
} from "./common";
import { chainSlugReverseMap } from "./enumMaps";
import { getJsonRpcUrl, rpcKeys } from "../helpers";
import { providers } from "ethers";

export const addNewToken = async (customPrompts) => {
  let chainOptions = [...MainnetIds, ...TestnetIds].map((chain) => ({
    title: chainSlugReverseMap.get(String(chain)),
    value: chain,
  }));
  let newTokenInfo = await getNewTokenInfo(chainOptions, customPrompts);
  if (newTokenInfo === "back") return "back";
  if (!newTokenInfo.name) return;

  console.log("Adding new token: ", newTokenInfo);
  console.log(Object.keys(Tokens), newTokenInfo.symbol.toUpperCase());
  if (!Object.keys(Tokens).includes(newTokenInfo.symbol.toUpperCase())) {
    await updateTokenEnums(newTokenInfo);
  }

  const newTokensEnum = {
    ...Tokens,
    [newTokenInfo.symbol.toUpperCase()]: newTokenInfo.symbol.toUpperCase(),
  };

  generateTokenAddressesFile(
    [
      {
        chainSlug: newTokenInfo.chainSlug as ChainSlug,
        token: newTokenInfo.symbol.toUpperCase() as Tokens,
        address: newTokenInfo.address,
      },
    ],
    newTokensEnum
  );
};

export const getNewTokenInfo = async (
  chainOptions: { title: string; value: number }[],
  customPrompts
): Promise<NewTokenInfo | "back"> => {
  let newTokenInfo: NewTokenInfo = {
    name: "",
    symbol: "",
    decimals: 0,
    address: "",
    chainSlug: 0 as ChainSlug,
  };

  const { chainSlug, address } = await customPrompts([
    {
      name: "chainSlug",
      type: "select",
      message: "Select chain where token is deployed",
      choices: chainOptions,
    },
    {
      name: "address",
      type: "text",
      message: "Enter token address",
      validate: (value) => validateEthereumAddress(value.trim()),
    },
  ]);

  if (chainSlug === "back" || address === "back") return "back";

  newTokenInfo.chainSlug = chainSlug as ChainSlug;
  newTokenInfo.address = address.trim();

  if (ExistingTokenAddresses[chainSlug]) {
    for (let [symbol, addr] of Object.entries(
      ExistingTokenAddresses[newTokenInfo.chainSlug]
    )) {
      if (addr.toLowerCase() === newTokenInfo.address.toLowerCase()) {
        console.log(
          `Token already present in the repo as ${symbol} on chain ${chainSlugReverseMap.get(
            String(chainSlug)
          )}`
        );
        return newTokenInfo;
      }
    }
  }

  let rpcKey = rpcKeys(chainSlug);
  let rpc = process.env[rpcKey];
  if (!rpc) {
    const rpcInfo = await customPrompts([
      {
        name: "rpc",
        type: "text",
        message: `Enter RPC url for the chain ${chainSlug} (for fetching token metadata)`,
        validate: (value) => validateRPC(chainSlug, value.trim()),
      },
    ]);

    if (rpcInfo === "back") return "back";

    rpc = rpcInfo.rpc.trim();
    appendToEnvFile(rpcKey, rpc);
  }

  let { name, symbol, decimals } = await getTokenMetadata(
    chainSlug,
    newTokenInfo.address,
    rpc
  );

  if (
    ExistingTokenAddresses[chainSlug]?.[symbol.toUpperCase()]?.toLowerCase() ===
    newTokenInfo.address.toLowerCase()
  ) {
    console.log("Token already present in the list");
    return newTokenInfo;
  }

  newTokenInfo = {
    ...newTokenInfo,
    name,
    symbol: symbol.toUpperCase(),
    decimals,
    chainSlug,
  };

  return newTokenInfo;
};
