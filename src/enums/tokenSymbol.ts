import { Tokens } from "./tokens";

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
  [Tokens.ETH]: "ETH",
};
