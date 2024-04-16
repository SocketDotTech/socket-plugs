import { Tokens } from "./tokens";

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
};
