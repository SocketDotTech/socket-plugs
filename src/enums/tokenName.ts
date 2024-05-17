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
  [Tokens.EIGEN]: "Eigen",
  [Tokens.ENA]: "ENA",
  [Tokens.USDe]: "USDe",
  [Tokens.eETH]: "ether.fi ETH",
  [Tokens.sDAI]: "Savings Dai",
  [Tokens.sUSDe]: "Staked USDe",
  [Tokens.wUSDM]: "Wrapped Mountain Protocol USD",
  [Tokens.weETH]: "Wrapped eETH",
};
