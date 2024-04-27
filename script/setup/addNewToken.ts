import prompts from "prompts";
import { updateTokenEnums } from "./configUtils";
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
  await updateTokenEnums(newTokenInfo);

  const newTokensEnum = {
    ...Tokens,
    [newTokenInfo.symbol.toUpperCase()]: newTokenInfo.symbol.toUpperCase(),
  };

  generateTokenAddressesFile(
    newTokenInfo.chainSlug,
    newTokenInfo.symbol.toUpperCase() as Tokens,
    newTokenInfo.address,
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

  const { chainSlug } = await prompts([
    {
      name: "chainSlug",
      type: "select",
      message: "Select chain where token is deployed",
      choices: chainOptions,
    },
  ]);

  const isChainPresent = ExistingTokenAddresses[chainSlug];
  if (isChainPresent) {
    console.log("We have the following tokens on this chain:");

    console.table(ExistingTokenAddresses[chainSlug]);
  }

  if (isChainPresent) {
    const continueInfo = await prompts([
      {
        name: "continue",
        type: "confirm",
        message:
          "Do you want to add a new token? (Select no if already present) ",
        active: "yes",
        inactive: "no",
      },
    ]);
    if (!continueInfo.continue) return newTokenInfo;
  }
  let rpcKey = rpcKeys(chainSlug);
  let rpc = process.env[rpcKey];
  if (!rpc) {
    const rpcInfo = await prompts([
      {
        name: "rpc",
        type: "text",
        message: `Enter RPC url for the chain ${chainSlug} (for fetching token metadata. Add it to .env file as ${rpcKey} to avoid entering again)`,
        validate: (value) => validateRPC(chainSlug, value.trim()),
      },
    ]);
    rpc = rpcInfo.rpc.trim();
  }
  newTokenInfo = await prompts([
    {
      name: "address",
      type: "text",
      message: "Enter token address",
      validate: (value) => validateEthereumAddress(value.trim()),
    },
  ]);

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
