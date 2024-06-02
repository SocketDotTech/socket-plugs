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
  [Tokens.TESTOKEN]: "TESTOKEN",
  [Tokens.TOKEN1]: "token1",
  [Tokens.TEST2]: "TEST2",
  [Tokens.TEST3]: "TEST3",
  [Tokens.PEPE]: "Pepe",
};
