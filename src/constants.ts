import { Tokens } from "./types";

export const tokenName: { [key in Tokens]: string } = {
  [Tokens.Moon]: "Moon",
  [Tokens.USDCE]: "Bridged USD coin",
  [Tokens.USDC]: "USD coin",
  [Tokens.WETH]: "Wrapped Ether",
  [Tokens.WBTC]: "Wrapped Bitcoin",
  [Tokens.USDT]: "Tether USD",
  [Tokens.DAI]: "Dai Stablecoin",
};

export const tokenSymbol: { [key in Tokens]: string } = {
  [Tokens.Moon]: "MOON",
  [Tokens.USDCE]: "USDC.e",
  [Tokens.USDC]: "USDC",
  [Tokens.WETH]: "WETH",
  [Tokens.WBTC]: "WBTC",
  [Tokens.USDT]: "USDT",
  [Tokens.DAI]: "DAI",
};

export const tokenDecimals: { [key in Tokens]: number } = {
  [Tokens.Moon]: 18,
  [Tokens.USDC]: 6,
  [Tokens.USDCE]: 6,
  [Tokens.WETH]: 18,
  [Tokens.WBTC]: 8,
  [Tokens.USDT]: 6,
  [Tokens.DAI]: 18,
};
