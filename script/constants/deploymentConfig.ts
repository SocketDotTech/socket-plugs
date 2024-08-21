import {
  ChainSlug,
  DeploymentAddresses,
  DeploymentMode,
  getAllAddresses,
  MainnetIds,
  S3ChainConfig,
  S3Config,
  TestnetIds,
} from "@socket.tech/dl-core";
import { getMode } from "./config";
import { chainSlugReverseMap } from "../setup/enumMaps";

export const DEPLOYMENT_CONFIG_URL =
  "https://surge-deploy.socket.tech/v1/getS3Config";
export let testnetIds: ChainSlug[] = [];
export let mainnetIds: ChainSlug[] = [];
export let addresses: DeploymentAddresses = {};
export let chains: {
  [chainSlug in ChainSlug]?: S3ChainConfig;
} = {};

export const fetchDeploymentConfig = async (): Promise<S3Config> => {
  console.log("fetching deployment config...");
  const response = await fetch(DEPLOYMENT_CONFIG_URL);
  if (!response.ok) {
    throw new Error("Failed to fetch deployment config");
  }
  let result = await response.json();
  return result?.data;
};

export const initDeploymentConfig = async () => {
  if (getMode() === DeploymentMode.SURGE) {
    const config = await fetchDeploymentConfig();
    testnetIds = config.testnetIds;
    mainnetIds = config.mainnetIds;
    addresses = config.addresses;
    chains = config.chains;
  }
};

export const getTestnetIds = () => {
  return getMode() == DeploymentMode.PROD ? TestnetIds : testnetIds;
};
export const getMainnetIds = () => {
  return getMode() == DeploymentMode.PROD ? MainnetIds : mainnetIds;
};
export const getAddresses = (chainSlug: number, mode: DeploymentMode) => {
  return mode == DeploymentMode.PROD
    ? getAllAddresses(DeploymentMode.PROD)[chainSlug]
    : addresses[chainSlug];
};

export const getChainName = (chainSlug: number) => {
  let chainName =
    chainSlugReverseMap.get(String(chainSlug)) ?? chains[chainSlug].chainName;
  return chainName.toUpperCase().replace(/[\s-]/g, "_"); // convert to uppercase, replace space and - with _
};
