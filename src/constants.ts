import { ChainSlug } from "@socket.tech/dl-core";
import { Project, Tokens } from "./enums";

export const ChainSlugToProject: { [chainSlug in ChainSlug]?: Project } = {
  [ChainSlug.AEVO]: Project.AEVO,
  [ChainSlug.AEVO_TESTNET]: Project.AEVO_TESTNET,
  [ChainSlug.LYRA_TESTNET]: Project.LYRA_TESTNET,
  [ChainSlug.LYRA]: Project.LYRA,
  [ChainSlug.SX_NETWORK_TESTNET]: Project.SX_NETWORK_TESTNET,
};

// pool Id is used to identify a source when multiple tokens use same controller. This is useful for the cases like merging inbounds
// for USDC and USDCE so we dont have 2 versions of USDC on app chain.
export const tokensWithOnePoolId: Tokens[] = [Tokens.USDCE, Tokens.WETH];

export const tokensAllowingMergingInbound: {
  [token in Tokens]?: Tokens[];
} = {
  [Tokens.USDC]: [Tokens.USDCE], // Currently only USDC can be merged into USDCE. Later on can add SUSD, USDT, DAI, etc. if needed.
  [Tokens.USDCE]: [Tokens.USDC],
  [Tokens.WETH]: [Tokens.ETH],
  [Tokens.ETH]: [Tokens.WETH],
};
