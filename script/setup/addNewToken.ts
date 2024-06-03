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

export const addNewToken = async () => {
  let chainOptions = [...MainnetIds, ...TestnetIds].map((chain) => ({
    title: chainSlugReverseMap.get(String(chain)),
    value: chain,
  }));
  let newTokenInfo: NewTokenInfo = await getNewTokenInfo(chainOptions);
  if (!newTokenInfo.name) return;
  console.log("Adding new token: ", newTokenInfo);
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
  chainOptions: { title: string; value: number }[]
) => {
  let newTokenInfo: NewTokenInfo = {
    name: "",
    symbol: "",
    decimals: 0,
    address: "",
    chainSlug: 0 as ChainSlug,
  };

  const { chainSlug, address } = await prompts([
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
  newTokenInfo.chainSlug = chainSlug as ChainSlug;
  newTokenInfo.address = address.trim();

  if (ExistingTokenAddresses[chainSlug]) {
    for (let [symbol, address] of Object.entries(
      ExistingTokenAddresses[newTokenInfo.chainSlug]
    )) {
      if (address.toLowerCase() === newTokenInfo.address.toLowerCase()) {
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
    const rpcInfo = await prompts([
      {
        name: "rpc",
        type: "text",
        message: `Enter RPC url for the chain ${chainSlug} (for fetching token metadata)`,
        validate: (value) => validateRPC(chainSlug, value.trim()),
      },
    ]);
    rpc = rpcInfo.rpc.trim();
    appendToEnvFile(rpcKey, rpc);
  }

  newTokenInfo.address = newTokenInfo.address.trim();
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
  console.log("fetched token metadata: ", { name, symbol, decimals });
  newTokenInfo = {
    ...newTokenInfo,
    name,
    symbol: symbol.toUpperCase(),
    decimals,
    chainSlug,
  };
  return newTokenInfo;
};
