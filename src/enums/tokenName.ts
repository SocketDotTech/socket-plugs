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
  [Tokens.GUARD]: "Guardian",
  [Tokens.ETH]: "Ether",
  [Tokens.MTK]: "MockToken",
  [Tokens.FUD]: "Aavegotchi FUD",
  [Tokens.FOMO]: "Aavegotchi FOMO",
  [Tokens.ALPHA]: "Aavegotchi ALPHA",
  [Tokens.KEK]: "Aavegotchi KEK",
  [Tokens.GLTR]: "GAX Liquidity Token Reward",
  [Tokens.STIME]: "SuperTimeToken",
};
