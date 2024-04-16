import { ChainSlug } from "@socket.tech/dl-core";
import { Project, Tokens } from "./enums";

export const ChainSlugToProject: { [chainSlug in ChainSlug]?: Project } = {
  [ChainSlug.AEVO]: Project.AEVO,
  [ChainSlug.AEVO_TESTNET]: Project.AEVO_TESTNET,
  [ChainSlug.LYRA_TESTNET]: Project.LYRA_TESTNET,
  [ChainSlug.LYRA]: Project.LYRA,
  [ChainSlug.SX_NETWORK_TESTNET]: Project.SX_NETWORK_TESTNET,
  // [ChainSlug.OPTIMISM_SEPOLIA]: Project.SOCKET_DEV,
  [ChainSlug.MODE_TESTNET]: Project.MODE_TESTNET,
  [ChainSlug.VICTION_TESTNET]: Project.VICTION_TESTNET,
  [ChainSlug.MODE]: Project.MODE,
  [ChainSlug.ANCIENT8_TESTNET2]: Project.ANCIENT8_TESTNET2,
};
