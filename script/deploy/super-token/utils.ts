import path from "path";
import { SuperTokenAddresses } from "../../../src";
import { mode } from "../../helpers/constants";
import { BigNumber, utils } from "ethers";

export const getSuperTokenProjectAddresses = async (
  project: string
): Promise<SuperTokenAddresses> => {
  let addresses: SuperTokenAddresses;
  try {
    addresses = await import(
      `../../deployments/supertoken/${mode}_${project}_addresses.json`
    );
  } catch (e) {
    console.log("addresses not found", e);
    throw new Error("addresses not found");
  }
  return addresses;
};

export const superTokenDeploymentsPath = path.join(
  __dirname,
  `/../../deployments/supertoken/`
);

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
