import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";
import { ContractFactory, Contract } from "ethers";

import fs from "fs";
import path from "path";
import { Address } from "hardhat-deploy/dist/types";
import { ChainSlug } from "@socket.tech/dl-core";

import { overrides } from "./networks";
import { TokenAddresses, ProjectAddresses } from "./types";
import { mode, project, projectConstants } from "./constants";

export const deploymentsPath = path.join(__dirname, `/../../deployments/`);

export const deployedAddressPath = () =>
  deploymentsPath + `${mode}_${project}_addresses.json`;

export interface DeployParams {
  addresses: TokenAddresses;
  signer: Wallet;
  currentChainSlug: number;
}

export const getOrDeploy = async (
  contractName: string,
  path: string,
  args: any[],
  deployUtils: DeployParams
): Promise<Contract> => {
  if (!deployUtils || !deployUtils.addresses)
    throw new Error("No addresses found");

  let contract: Contract;
  if (!deployUtils.addresses[contractName]) {
    contract = await deployContractWithArgs(
      contractName,
      args,
      deployUtils.signer
    );

    console.log(
      `${contractName} deployed on ${deployUtils.currentChainSlug} for ${mode}, ${project} at address ${contract.address}`
    );

    await storeVerificationParams(
      [contract.address, contractName, path, args],
      deployUtils.currentChainSlug
    );
  } else {
    contract = await getInstance(
      contractName,
      deployUtils.addresses[contractName]
    );
    console.log(
      `${contractName} found on ${deployUtils.currentChainSlug} for ${mode}, ${project} at address ${contract.address}`
    );
  }

  return contract;
};

export async function deployContractWithArgs(
  contractName: string,
  args: Array<any>,
  signer: Wallet
) {
  try {
    const Contract: ContractFactory = await ethers.getContractFactory(
      contractName
    );
    // gasLimit is set to undefined to not use the value set in overrides
    const contract: Contract = await Contract.connect(signer).deploy(...args, {
      ...overrides[await signer.getChainId()],
      // gasLimit: undefined,
    });
    await contract.deployed();
    return contract;
  } catch (error) {
    throw error;
  }
}

export const verify = async (
  address: string,
  contractName: string,
  path: string,
  args: any[]
) => {
  try {
    const chainSlug = await getChainSlug();
    if (chainSlug === 31337) return;

    await run("verify:verify", {
      address,
      contract: `${path}:${contractName}`,
      constructorArguments: args,
    });
  } catch (error) {
    console.log("Error during verification", error);
  }
};

export const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay * 1000));

export const getInstance = async (
  contractName: string,
  address: Address
): Promise<Contract> =>
  (await ethers.getContractFactory(contractName)).attach(address);

export const getChainSlug = async (): Promise<number> => {
  if (network.config.chainId === undefined)
    throw new Error("chain id not found");
  return Number(network.config.chainId);
};

export const storeAddresses = async (
  addresses: TokenAddresses,
  chainSlug: ChainSlug
) => {
  if (!fs.existsSync(deploymentsPath)) {
    await fs.promises.mkdir(deploymentsPath, { recursive: true });
  }

  const addressesPath = deploymentsPath + `${mode}_${project}_addresses.json`;
  const outputExists = fs.existsSync(addressesPath);
  let deploymentAddresses: ProjectAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(addressesPath, "utf-8");
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  deploymentAddresses = createObj(
    deploymentAddresses,
    [chainSlug.toString(), projectConstants.tokenToBridge],
    addresses
  );
  // deploymentAddresses[chainSlug][tokenToBridge] = addresses;
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
};

export const storeAllAddresses = async (addresses: ProjectAddresses) => {
  if (!fs.existsSync(deploymentsPath)) {
    await fs.promises.mkdir(deploymentsPath, { recursive: true });
  }

  const addressesPath = deploymentsPath + `${mode}_${project}_addresses.json`;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
};

let addresses: ProjectAddresses;
export const getProjectAddresses = async (): Promise<ProjectAddresses> => {
  if (!addresses)
    try {
      addresses = await import(
        `../../deployments/${mode}_${project}_addresses.json`
      );
    } catch (e) {
      console.log("addresses not found", e);
      throw new Error("addresses not found");
    }
  return addresses;
};

export const storeVerificationParams = async (
  verificationDetail: any[],
  chainSlug: ChainSlug
) => {
  if (!fs.existsSync(deploymentsPath)) {
    await fs.promises.mkdir(deploymentsPath);
  }
  const verificationPath =
    deploymentsPath + `${mode}_${project}_verification.json`;
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

export const createObj = function (obj: any, keys: string[], value: any): any {
  if (keys.length === 1) {
    obj[keys[0]] = value;
  } else {
    const key = keys.shift();
    if (key === undefined) return obj;
    obj[key] = createObj(
      typeof obj[key] === "undefined" ? {} : obj[key],
      keys,
      value
    );
  }
  return obj;
};


export function encodePoolId(
  chainSlug: number,
  poolCount: number
) {
  const encodedValue =
    (BigInt(chainSlug) << BigInt(224)) |
    BigInt(poolCount);

  // Ensure the result is a 32-byte hex string (bytes32 in Solidity)
  const resultHex = encodedValue.toString(16).padStart(64, "0");
  return "0x" + resultHex;
}
