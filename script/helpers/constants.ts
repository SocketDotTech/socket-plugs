import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { utils } from "ethers";
import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";

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

export const tokenName = "Moon";
export const tokenSymbol = "MOON";
export const tokenDecimals = 18;
export const totalSupply = utils.parseUnits("1000000000", "ether");

export const FAST_MAX_LIMIT = utils.parseUnits("100", "ether");;
export const FAST_RATE = 1;
export const SLOW_MAX_LIMIT = utils.parseUnits("500", "ether");;
export const SLOW_RATE = 2;
