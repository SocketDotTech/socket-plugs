import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "./types";
import { BigNumber, utils } from "ethers";

if (!process.env.SOCKET_OWNER_ADDRESS)
  throw Error("Socket owner address not present");
export const socketOwner = process.env.SOCKET_OWNER_ADDRESS;

export const mode = process.env.DEPLOYMENT_MODE as
  | DeploymentMode
  | DeploymentMode.DEV;

console.log("========================================================");
console.log("Deployment started for MODE", mode);
console.log(
  `Make sure ${mode}_addresses.json and ${mode}_verification.json is cleared for given networks if redeploying!!`
);
console.log(`Owner address configured to ${socketOwner}`);
console.log("========================================================");

export const chains: Array<ChainSlug> =
  mode === DeploymentMode.DEV
    ? [
        ChainSlug.ARBITRUM_GOERLI,
        ChainSlug.OPTIMISM_GOERLI,
        ChainSlug.AEVO_TESTNET,
      ]
    : [ChainSlug.ARBITRUM, ChainSlug.OPTIMISM, ChainSlug.AEVO];

export const isAppChain = (chain: ChainSlug) =>
  chain === ChainSlug.AEVO || chain === ChainSlug.AEVO_TESTNET;
export const integrationTypes = [
  IntegrationTypes.fast,
  // IntegrationTypes.optimistic,
];

export const tokenToBridge: Tokens = Tokens.USDC;

export const tokenName = {
  [Tokens.Moon]: "Moon",
  [Tokens.USDC]: "USD coin",
};

export const tokenSymbol = {
  [Tokens.Moon]: "MOON",
  [Tokens.USDC]: "USDC",
};

export const tokenDecimals = {
  [Tokens.Moon]: 18,
  [Tokens.USDC]: 6,
};

export const totalSupply = utils.parseUnits(
  "1000000000",
  tokenDecimals[tokenToBridge]
);

export const FAST_MAX_LIMIT = utils.parseUnits(
  "100000",
  tokenDecimals[tokenToBridge]
);
export const SLOW_MAX_LIMIT = utils.parseUnits(
  "500",
  tokenDecimals[tokenToBridge]
);

export const FAST_RATE = utils.parseUnits(
  "1.1574",
  tokenDecimals[tokenToBridge]
);
export const SLOW_RATE = utils.parseUnits("2", tokenDecimals[tokenToBridge]);
