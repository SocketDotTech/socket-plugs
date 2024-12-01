import prompts from "prompts";
import { appendToEnvFile, updateNFTEnums } from "./configUtils";
import { ChainSlug, MainnetIds, TestnetIds } from "@socket.tech/dl-core";
import { ExistingNFTAddresses, NFTs } from "../../src/enums";
import { generateNFTAddressesFile } from "./updateExistingNFTAddresses";
import {
  NewNFTInfo,
  NFTType,
  validateEmptyValue,
  validateEthereumAddress,
  validateRPC,
} from "./common";
import { chainSlugReverseMap } from "./enumMaps";
import { rpcKeys } from "../helpers";

export const addNewNFT = async () => {
  let chainOptions = [...MainnetIds, ...TestnetIds].map((chain) => ({
    title: chainSlugReverseMap.get(String(chain)),
    value: chain,
  }));
  let newNFTInfo: NewNFTInfo = await getNewNFTInfo(chainOptions);
  console.log("newNFTInfo", newNFTInfo);
  if (!newNFTInfo.name) return;
  console.log("Adding new token: ", newNFTInfo);
  if (!Object.keys(NFTs).includes(newNFTInfo.symbol.toUpperCase())) {
    await updateNFTEnums(newNFTInfo);
  }

  const newNFTsEnum = {
    ...NFTs,
    [newNFTInfo.symbol.toUpperCase()]: newNFTInfo.symbol.toUpperCase(),
  };

  generateNFTAddressesFile(
    [
      {
        chainSlug: newNFTInfo.chainSlug as ChainSlug,
        token: newNFTInfo.symbol.toUpperCase() as NFTs,
        address: newNFTInfo.address,
      },
    ],
    newNFTsEnum
  );
};

export const getNewNFTInfo = async (
  chainOptions: { title: string; value: number }[]
) => {
  let newNFTInfo: NewNFTInfo = {
    name: "",
    symbol: "",
    type: NFTType.ERC721,
    address: "",
    chainSlug: 0 as ChainSlug,
  };

  const { name, symbol, type, chainSlug, address } = await prompts([
    {
      name: "name",
      type: "text",
      message: "Enter NFT name",
      validate: (value) => validateEmptyValue(value.trim()),
    },
    {
      name: "type",
      type: "select",
      message: "Select NFT type",
      choices: [
        {
          title: "ERC721",
          value: NFTType.ERC721,
        },
        {
          title: "ERC1155",
          value: NFTType.ERC1155,
        },
      ],
    },
    {
      name: "symbol",
      type: "text",
      message: "Enter NFT symbol",
      validate: (value) => validateEmptyValue(value.trim()),
    },
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
  newNFTInfo.name = name;
  newNFTInfo.symbol = symbol;
  newNFTInfo.type = type;
  newNFTInfo.chainSlug = chainSlug as ChainSlug;
  newNFTInfo.address = address.trim();

  if (ExistingNFTAddresses[chainSlug]) {
    for (let [symbol, address] of Object.entries(
      ExistingNFTAddresses[newNFTInfo.chainSlug]
    )) {
      if (address.toLowerCase() === newNFTInfo.address.toLowerCase()) {
        console.log(
          `NFT already present in the repo as ${symbol} on chain ${chainSlugReverseMap.get(
            String(chainSlug)
          )}`
        );
        return newNFTInfo;
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

  newNFTInfo.address = newNFTInfo.address.trim();
  if (
    ExistingNFTAddresses[chainSlug]?.[
      newNFTInfo.symbol.toUpperCase()
    ]?.toLowerCase() === newNFTInfo.address.toLowerCase()
  ) {
    console.log("Token already present in the list");
    return newNFTInfo;
  }
  newNFTInfo = {
    ...newNFTInfo,
    symbol: newNFTInfo.symbol.toUpperCase(),
    chainSlug,
  };
  return newNFTInfo;
};
