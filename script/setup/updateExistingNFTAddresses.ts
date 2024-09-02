import fs from "fs";
import { ChainSlug } from "../../src";
import { enumFolderPath, serializeConstants } from "./configUtils";
import { NFTs } from "../../src/enums";
import { ExistingNFTAddresses } from "../../src/enums";

export type NFTAddressObj = {
  chainSlug: ChainSlug;
  token: NFTs | string;
  address: string;
};
export const generateNFTAddressesFile = (
  tokenAddresses: NFTAddressObj[],
  nftsEnum: object = NFTs
) => {
  for (const tokenAddressObj of tokenAddresses) {
    const { chainSlug, token, address } = tokenAddressObj;
    if (!ExistingNFTAddresses[chainSlug]) ExistingNFTAddresses[chainSlug] = {};
    ExistingNFTAddresses[chainSlug][token] = address;
  }
  const serializedContent = serializeConstants(
    ExistingNFTAddresses,
    0,
    {},
    nftsEnum
  );
  const content = `
  import { ChainSlug } from "@socket.tech/dl-core";
  import { NFTs } from "./nfts";
  
  export const ExistingNFTAddresses: {
    [key in ChainSlug]?: { [key in NFTs]?: string };
  } = {
    ${serializedContent}
};
`;
  fs.writeFileSync(enumFolderPath + "existing-nft-addresses.ts", content);
  console.log(
    `✔  existing nft addresses file updated : ${
      enumFolderPath + "existing-nft-addresses.ts"
    }`
  );
};
