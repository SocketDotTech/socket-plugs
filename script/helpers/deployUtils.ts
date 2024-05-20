import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";
import { ContractFactory, Contract } from "ethers";

import fs from "fs";
import { Address } from "hardhat-deploy/dist/types";
import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
  DeploymentMode,
} from "@socket.tech/dl-core";
import socketABI from "@socket.tech/dl-core/artifacts/abi/Socket.json";
import { overrides } from "./networks";
import { getMode, getProjectName, isSuperBridge } from "../constants/config";
import {
  SuperBridgeContracts,
  Hooks,
  Tokens,
  STTokenAddresses,
  SBTokenAddresses,
  SBAddresses,
  STAddresses,
  DeployParams,
} from "../../src";
import {
  deploymentPath,
  getDeploymentPath,
  getVerificationPath,
  readJSONFile,
} from "./utils";

export const getOrDeploy = async (
  contractName: string,
  path: string,
  args: any[],
  deployUtils: DeployParams
): Promise<Contract> => {
  if (!deployUtils || !deployUtils.addresses)
    throw new Error("No addresses found");

  let contract: Contract;
  let storedContactAddress = deployUtils.addresses[contractName];
  if (contractName === SuperBridgeContracts.FiatTokenV2_1_Controller) {
    storedContactAddress =
      deployUtils.addresses[SuperBridgeContracts.Controller];
  }
  if (!storedContactAddress) {
    contract = await deployContractWithArgs(
      contractName,
      args,
      deployUtils.signer
    );

    console.log(
      `${contractName} deployed on ${
        deployUtils.currentChainSlug
      } for ${getMode()}, ${getProjectName()} at address ${contract.address}`
    );

    await storeVerificationParams(
      [contract.address, contractName, path, args],
      deployUtils.currentChainSlug
    );
  } else {
    contract = await getInstance(contractName, storedContactAddress);
    console.log(
      `${contractName} found on ${
        deployUtils.currentChainSlug
      } for ${getMode()}, ${getProjectName()} at address ${contract.address}`
    );
  }

  return contract;
};
export const getOrDeployConnector = async (
  args: any[],
  deployUtils: DeployParams,
  sibling: ChainSlug,
  integrationType: IntegrationTypes
): Promise<Contract> => {
  if (!deployUtils || !deployUtils.addresses)
    throw new Error("No addresses found");

  let contract: Contract;
  let storedContactAddress = (deployUtils.addresses as SBTokenAddresses)
    .connectors?.[sibling]?.[integrationType];

  if (!storedContactAddress) {
    contract = await deployContractWithArgs(
      SuperBridgeContracts.ConnectorPlug,
      args,
      deployUtils.signer
    );

    console.log(
      `${SuperBridgeContracts.ConnectorPlug} deployed on ${
        deployUtils.currentChainSlug
      } for ${getMode()}, ${getProjectName()} at address ${contract.address}`
    );

    await storeVerificationParams(
      [
        contract.address,
        SuperBridgeContracts.ConnectorPlug,
        "contracts/ConnectorPlug.sol",
        args,
      ],
      deployUtils.currentChainSlug
    );
  } else {
    contract = await getInstance(
      SuperBridgeContracts.ConnectorPlug,
      storedContactAddress
    );
    console.log(
      `${SuperBridgeContracts.ConnectorPlug} found on ${
        deployUtils.currentChainSlug
      } for ${getMode()}, ${getProjectName()} at address ${contract.address}`
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
): Promise<Contract> => ethers.getContractAt(contractName, address);

export const getChainSlug = async (): Promise<number> => {
  if (network.config.chainId === undefined)
    throw new Error("chain id not found");
  return Number(network.config.chainId);
};

export const getSocket = (chain: ChainSlug, signer: Wallet): Contract => {
  return new Contract(getAddresses(chain, getMode()).Socket, socketABI, signer);
};

export const storeTokenAddresses = async (
  addresses: SBTokenAddresses,
  chainSlug: ChainSlug,
  tokenName: Tokens
) => {
  let deploymentAddresses: SBAddresses | STAddresses = readJSONFile(
    getDeploymentPath()
  );

  deploymentAddresses = createObj(
    deploymentAddresses,
    [chainSlug.toString(), tokenName],
    addresses
  );
  fs.writeFileSync(
    getDeploymentPath(),
    JSON.stringify(deploymentAddresses, null, 2)
  );
};

export const storeAllAddresses = async (addresses: SBAddresses) => {
  fs.writeFileSync(getDeploymentPath(), JSON.stringify(addresses, null, 2));
};

let addresses: SBAddresses | STAddresses;
export const getAllAddresses = (
  type_override?: string
): SBAddresses | STAddresses => {
  if (!type_override && addresses) return addresses;
  addresses = readJSONFile(getDeploymentPath(type_override));
  return addresses;
};

export const getSuperBridgeAddresses = (): SBAddresses => {
  return getAllAddresses("superbridge") as SBAddresses;
};
export const getSuperTokenAddresses = (): STAddresses => {
  return getAllAddresses("supertoken") as STAddresses;
};

export const storeVerificationParams = async (
  verificationDetail: any[],
  chainSlug: ChainSlug
) => {
  let verificationDetails: object = readJSONFile(getVerificationPath());

  if (!verificationDetails[chainSlug]) verificationDetails[chainSlug] = [];
  verificationDetails[chainSlug] = [
    verificationDetail,
    ...verificationDetails[chainSlug],
  ];

  fs.writeFileSync(
    getVerificationPath(),
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
