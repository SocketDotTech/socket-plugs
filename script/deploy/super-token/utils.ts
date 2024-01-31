import fs from "fs";
import path from "path";

import {
  ChainSlug,
  SuperTokenAddresses,
  SuperTokenChainAddresses,
} from "../../../src";
import { BigNumber, Contract, utils } from "ethers";
import { getMode } from "../../constants/config";
import { DeployParams, deployContractWithArgs } from "../../helpers/utils";
import { getInstance } from "./bridge/utils";

export const getSuperTokenProjectAddresses = async (
  project: string
): Promise<SuperTokenAddresses> => {
  let addresses: SuperTokenAddresses;
  try {
    addresses = await import(
      `../../../deployments/supertoken/${getMode()}_${project}_addresses.json`
    );
  } catch (e) {
    throw new Error(`addresses not found, ${e}`);
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

export const getOrDeployContract = async (
  contractName: string,
  path: string,
  args: any[],
  deployUtils: DeployParams,
  fileName: string
): Promise<Contract> => {
  if (!deployUtils || !deployUtils.addresses)
    throw new Error("No addresses found");

  let contract: Contract;
  const storedContactAddress = deployUtils.addresses[contractName];
  if (!storedContactAddress) {
    contract = await deployContractWithArgs(
      contractName,
      args,
      deployUtils.signer
    );
    console.log(
      `${contractName} deployed on ${deployUtils.currentChainSlug} at address ${contract.address}`
    );

    await storeVerificationParamsForSuperToken(
      [contract.address, contractName, path, args],
      deployUtils.currentChainSlug,
      fileName
    );
  } else {
    contract = await getInstance(contractName, storedContactAddress);
    console.log(
      `${contractName} found on ${deployUtils.currentChainSlug} at address ${contract.address}`
    );
  }

  return contract;
};

export const storeVerificationParamsForSuperToken = async (
  verificationDetail: any[],
  chainSlug: ChainSlug,
  fileName: string
) => {
  if (!fs.existsSync(superTokenDeploymentsPath)) {
    await fs.promises.mkdir(superTokenDeploymentsPath);
  }
  const verificationPath =
    superTokenDeploymentsPath + `${fileName}_verification.json`;
  const outputExists = fs.existsSync(verificationPath);
  let verificationDetails: object = {};
  if (outputExists) {
    const verificationDetailsString = fs.readFileSync(
      verificationPath,
      "utf-8"
    );
    verificationDetails = JSON.parse(verificationDetailsString);
  }

  if (!verificationDetails[chainSlug]) verificationDetails[chainSlug] = [];
  verificationDetails[chainSlug] = [
    verificationDetail,
    ...verificationDetails[chainSlug],
  ];

  fs.writeFileSync(
    verificationPath,
    JSON.stringify(verificationDetails, null, 2)
  );
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
