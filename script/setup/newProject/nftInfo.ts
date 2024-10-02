import { ChainSlug } from "@socket.tech/dl-core";
import prompts from "prompts";
import { ProjectType } from "../../../src";
import { ExistingNFTAddresses, NFTs } from "../../../src/enums";
import { validateEthereumAddress } from "../common";
import { nftEnum, NFTInfo } from "./main";
import { getChainName } from "../../constants";

export const getProjectNFTInfo = async (
  projectType: ProjectType,
  vaultChains: ChainSlug[],
  controllerChains: ChainSlug[]
): Promise<NFTInfo> => {
  const nftChoices = Object.keys(nftEnum).map((nft) => ({
    title: nft,
    value: nftEnum[nft],
  }));
  if (projectType == ProjectType.SUPERBRIDGE) {
    const response = await prompts([
      {
        name: "nft",
        type: "select",
        message:
          "Select the NFT to connect (the NFT we want to allow users to bridge to app chain)",
        choices: nftChoices,
      },
    ]);
    const nft = response.nft as NFTs;
    const nftAddresses = await getSuperbridgeMissingNFTAddresses(nft, [
      ...vaultChains,
      ...controllerChains,
    ]);

    return { nft, nftAddresses };
  } else if (projectType === ProjectType.SUPERTOKEN) {
    console.log(`SUPERTOKEN project not supported for NFT now`);
  }
};

export const getSuperbridgeMissingNFTAddresses = async (
  nft: NFTs,
  chainList: number[]
) => {
  const nftAddresses: {
    [key in NFTs]?: {
      [chainslug: number]: string;
    };
  } = {};

  nftAddresses[nft] = {};
  for (const chain of chainList) {
    const currentAddress = ExistingNFTAddresses[chain]?.[nft];
    if (currentAddress) continue;
    const response = await prompts([
      {
        name: "address",
        type: "text",
        message: `Enter the address of the deployed NFT ${nft} on the chain ${getChainName(
          chain
        )}`,
        validate: (value) => validateEthereumAddress(value.trim()),
      },
    ]);
    nftAddresses[nft][chain] = response.address;
  }
  return nftAddresses;
};
