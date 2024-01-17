import fs from "fs";
import path from "path";

import {
  ChainSlug,
  SuperTokenAddresses,
  SuperTokenChainAddresses,
} from "../../../src";
import { BigNumber, utils } from "ethers";
import { getMode } from "../../constants/config";

export const getSuperTokenProjectAddresses = async (
  project: string
): Promise<SuperTokenAddresses> => {
  let addresses: SuperTokenAddresses;
  try {
    addresses = await import(
      `../../../deployments/supertoken/${getMode()}_${project}_addresses.json`
    );
  } catch (e) {
    console.log("addresses not found", e);
    throw new Error("addresses not found");
  }
  return addresses;
};

export const superTokenDeploymentsPath = path.join(
  __dirname,
  `../../../deployments/supertoken/`
);

export const storeSuperTokenAddresses = async (
  addresses: SuperTokenChainAddresses,
  chainSlug: ChainSlug,
  fileName: string,
  pathToDeployments: string
) => {
  if (!fs.existsSync(pathToDeployments)) {
    await fs.promises.mkdir(pathToDeployments, { recursive: true });
  }

  const addressesPath = pathToDeployments + fileName;
  const outputExists = fs.existsSync(addressesPath);
  let deploymentAddresses: SuperTokenAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(addressesPath, "utf-8");
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  deploymentAddresses[chainSlug.toString()] = addresses;
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
};

export const getSuperTokenLimitBN = (
  limit: string,
  isDeposit: boolean,
  decimals: number
): BigNumber => {
  if (isDeposit) {
    return utils.parseUnits(limit, decimals);
  } else {
    return utils.parseUnits(limit, decimals);
  }
};

export const getSuperTokenRateBN = (
  rate: string,
  isDeposit: boolean,
  decimals: number
): BigNumber => {
  if (isDeposit) {
    return utils.parseUnits(rate, decimals);
  } else {
    return utils.parseUnits(rate, decimals);
  }
};
