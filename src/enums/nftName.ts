import { NFTs } from "./nfts";

export const nftName: { [key in NFTs]: string } = {
  [NFTs.GOTCHI]: "Aavegotchi",
  [NFTs.GOTCHI_ITEM]: "Aavegotchi Item",
  [NFTs.FORGE]: "Aavegotchi Forge",
  [NFTs.REALM]: "Gotchiverse Realm",
  [NFTs.INSTALLATION]: "Gotchiverse Installation",
};
