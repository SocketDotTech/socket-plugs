import { ChainSlug } from "@socket.tech/dl-core";
import { Project, Tokens } from "./enum";

export const tokenName: { [key in Tokens]: string } = {
  [Tokens.Moon]: "Moon",
  [Tokens.USDCE]: "Bridged USD coin",
  [Tokens.USDC]: "USD coin",
  [Tokens.WETH]: "Wrapped Ether",
  [Tokens.WBTC]: "Wrapped Bitcoin",
  [Tokens.USDT]: "Tether USD",
  [Tokens.SNX]: "Synthetix Network Token",
  [Tokens.WSTETH]: "Wrapped liquid staked Ether 2.0",
  [Tokens.DAI]: "Dai Stablecoin",
  [Tokens.GUARD]: "Guardian",
  [Tokens.WEETH]: "Wrapped eETH",
  [Tokens.RSWETH]: "Restaked Swell ETH",
  [Tokens.WEETHC]: "Lyra Wrapped eETH Covered Call Shares",
  [Tokens.RSWETHC]: "Lyra Restaked Swell ETH Covered Call Shares",
};

export const tokenSymbol: { [key in Tokens]: string } = {
  [Tokens.Moon]: "MOON",
  [Tokens.USDCE]: "USDC.e",
  [Tokens.USDC]: "USDC",
  [Tokens.WETH]: "WETH",
  [Tokens.WBTC]: "WBTC",
  [Tokens.USDT]: "USDT",
  [Tokens.SNX]: "SNX",
  [Tokens.WSTETH]: "wstETH",
  [Tokens.DAI]: "DAI",
  [Tokens.GUARD]: "GUARD",
  [Tokens.WEETH]: "weETH",
  [Tokens.RSWETH]: "rswETH",
  [Tokens.WEETHC]: "weETHC",
  [Tokens.RSWETHC]: "rswETHC",
};

export const tokenDecimals: { [key in Tokens]: number } = {
  [Tokens.Moon]: 18,
  [Tokens.USDC]: 6,
  [Tokens.USDCE]: 6,
  [Tokens.WETH]: 18,
  [Tokens.WBTC]: 8,
  [Tokens.USDT]: 6,
  [Tokens.SNX]: 18,
  [Tokens.WSTETH]: 18,
  [Tokens.DAI]: 18,
  [Tokens.GUARD]: 18,
  [Tokens.WEETH]: 18,
  [Tokens.RSWETH]: 18,
  [Tokens.WEETHC]: 18,
  [Tokens.RSWETHC]: 18,
};

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
