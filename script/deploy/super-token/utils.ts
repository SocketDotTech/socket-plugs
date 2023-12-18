import path from "path";
import { SuperTokenAddresses } from "../../../src";
import { mode } from "../../helpers/constants";

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
