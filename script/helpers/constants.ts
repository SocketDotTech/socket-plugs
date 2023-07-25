import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "./types";
import { BigNumber } from "ethers";

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

export const chains: Array<ChainSlug> = [
  ChainSlug.ARBITRUM_GOERLI,
  ChainSlug.OPTIMISM_GOERLI,
  ChainSlug.AEVO_TESTNET,
];

export const isAppChain = (chain: ChainSlug) =>
  chain === ChainSlug.AEVO_TESTNET;
export const integrationTypes = [
  IntegrationTypes.fast,
  IntegrationTypes.optimistic,
];

export const tokenToBridge: Tokens = Tokens.Moon;
const parseToWei = (num: number, decimals: number): BigNumber => BigNumber.from(num).mul(BigNumber.from(Math.pow(10, decimals).toString()));

export const tokenName = (tokenToBridge) => tokenToBridge === Tokens.Moon ? "Moon" : "USD coin";
export const tokenSymbol = (tokenToBridge) => tokenToBridge === Tokens.Moon ? "MOON" : "USDC";
export const tokenDecimals = (tokenToBridge) => tokenToBridge === Tokens.Moon ? 18 : 6;
export const totalSupply = parseToWei(1000000000, tokenDecimals(tokenToBridge));

export const FAST_MAX_LIMIT = parseToWei(3600, tokenDecimals(tokenToBridge));
export const SLOW_MAX_LIMIT = parseToWei(500, tokenDecimals(tokenToBridge));

export const FAST_RATE = parseToWei(1, tokenDecimals(tokenToBridge));
export const SLOW_RATE = parseToWei(2, tokenDecimals(tokenToBridge));
