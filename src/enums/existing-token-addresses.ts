import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "./tokens";

export const ExistingTokenAddresses: {
  [key in ChainSlug]?: { [key in Tokens]?: string };
} = {
  [ChainSlug.MAINNET]: {
    [Tokens.USDC]: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    [Tokens.USDT]: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    [Tokens.WETH]: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
    [Tokens.WBTC]: "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599",
    [Tokens.SNX]: "0xc011a73ee8576fb46f5e1c5751ca3b9fe0af2a6f",
    [Tokens.WSTETH]: "0x7f39c581f595b53c5cb19bd0b3f8da6c935e2ca0",
    [Tokens.DAI]: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  },
  [ChainSlug.OPTIMISM]: {
    [Tokens.USDC]: "0x8e0b7e6062272B5eF4524250bFFF8e5Bd3497757",
    [Tokens.USDCE]: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
    [Tokens.USDT]: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
    [Tokens.WETH]: "0x4200000000000000000000000000000000000006",
    [Tokens.WBTC]: "0x68f180fcce6836688e9084f035309e29bf0a2095",
    [Tokens.SNX]: "0x8700daec35af8ff88c16bdf0418774cb3d7599b4",
    [Tokens.WSTETH]: "0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb",
    [Tokens.DAI]: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  },
  [ChainSlug.POLYGON_MAINNET]: {
    [Tokens.USDC]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
    [Tokens.USDCE]: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    [Tokens.FUD]: "0x403e967b044d4be25170310157cb1a4bf10bdd0f",
    [Tokens.FOMO]: "0x44a6e0be76e1d9620a7f76588e4509fe4fa8e8c8",
    [Tokens.ALPHA]: "0x6a3E7C3c6EF65Ee26975b12293cA1AAD7e1dAeD2",
    [Tokens.KEK]: "0x42E5E06EF5b90Fe15F853F59299Fc96259209c5C",
    [Tokens.GLTR]: "0x3801C3B3B5c98F88a9c9005966AA96aa440B9Afc",
    [Tokens.USDT]: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    [Tokens.DAI]: "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    [Tokens.WETH]: "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619",
    [Tokens.WBTC]: "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6",
  },
  [ChainSlug.BASE]: {
    [Tokens.USDC]: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    [Tokens.WETH]: "0x4200000000000000000000000000000000000006",
    [Tokens.WSTETH]: "0xc1cba3fcea344f92d9239c08c0568f6f2f0ee452",
    [Tokens.DAI]: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  },
  [ChainSlug.ARBITRUM]: {
    [Tokens.USDC]: "0xaf88d065e77c8cC2239327C5EDb3A432268e5831",
    [Tokens.USDCE]: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    [Tokens.USDT]: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
    [Tokens.WETH]: "0x82af49447d8a07e3bd95bd0d56f35241523fbab1",
    [Tokens.WBTC]: "0x2f2a2543b76a4166549f7aab2e75bef0aefc5b0f",
    [Tokens.WSTETH]: "0x5979D7b546E38E414F7E9822514be443A4800529",
    [Tokens.DAI]: "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    [Tokens.MTK]: "0x094553F42B44Ea1492b0dcA5f4134F23f45db742",
    [Tokens.STIME]: "0x17AfF554423D2C40A1BBF51b443E9d43dd8AE1eb",
  },
  [ChainSlug.ARBITRUM_SEPOLIA]: {
    [Tokens.USDC]: "0x8537307810fC40F4073A12a38554D4Ff78EfFf41",
    [Tokens.USDT]: "0x66DFb9987C36c4be232156e70B085f664367599A",
    [Tokens.DAI]: "0x9a573B27D7298c6E2f4d2D4a41c37A0C8AF6accA",
    [Tokens.WETH]: "0x565810cbfa3Cf1390963E5aFa2fB953795686339",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    [Tokens.MTK]: "0x094553F42B44Ea1492b0dcA5f4134F23f45db742",
    [Tokens.WBTC]: "0x1019958C2BD43B882a4e1349337a32Ef9563FC4D",
  },
  [ChainSlug.SEPOLIA]: {
    [Tokens.USDC]: "0x565810cbfa3Cf1390963E5aFa2fB953795686339",
    [Tokens.USDT]: "0xB4130e87A180b9448286B291331aEe8A9C154A3A",
    [Tokens.DAI]: "0x255745E5C7Ae620b7f523F5E4A0Ead37660EC5d6",
    // [Tokens.WETH]: "0xE67ABDA0D43f7AC8f37876bBF00D1DFadbB93aaa", // actual weth
    [Tokens.WETH]: "0x771d1Ae208377453D478dF08BbC38034F72aC833", // dummy token
    [Tokens.WBTC]: "0x94BEff5da6201cB2C8F489196FD970B3DF5aA32A",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
  },
  [ChainSlug.AEVO_TESTNET]: {
    [Tokens.USDC]: "0x4D435C00E09034ec2113F63088CCD0be0a0fd06e",
  },
  [ChainSlug.OPTIMISM_SEPOLIA]: {
    [Tokens.USDC]: "0x6D290609b3F5F02D52F28d97C75a443ED8564cBf",
    [Tokens.USDT]: "0x2d1abA6FaBAe80bF5C1C9EA433AAe9030E07CB22",
    [Tokens.DAI]: "0xDC0258dc3dB980090E97EbF4f1FD9Cc3C5AD5894",
    [Tokens.WETH]: "0x2b42AFFD4b7C14d9B7C2579229495c052672Ccd3",
    [Tokens.ETH]: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    [Tokens.WBTC]: "0xfC5CC93d85861ac82d89fc2D3e56315540E9C8A7",
  },
};
