import { ChainSlug } from "@socket.tech/dl-core";
import { NFTs } from "./nfts";

export const ExistingNFTAddresses: {
  [key in ChainSlug]?: { [key in NFTs]?: string };
} = {
  [ChainSlug.POLYGON_MAINNET]: {
    [NFTs.GOTCHI]: "0x86935F11C86623deC8a25696E1C19a8659CbF95d",
    [NFTs.GOTCHI_ITEM]: "0x58de9AaBCaeEC0f69883C94318810ad79Cc6a44f",
    [NFTs.FORGE]: "0x4fDfc1B53Fd1D80d969C984ba7a8CE4c7bAaD442",
    [NFTs.REALM]: "0x1D0360BaC7299C86Ec8E99d0c1C9A95FEfaF2a11",
    [NFTs.INSTALLATION]: "0x19f870bD94A34b3adAa9CaA439d333DA18d6812A",
  },
};
