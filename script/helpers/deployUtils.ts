import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";
import { ContractFactory, Contract } from "ethers";

import fs from "fs";
import path from "path";
import { Address } from "hardhat-deploy/dist/types";
import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
} from "@socket.tech/dl-core";
import socketABI from "@socket.tech/dl-core/artifacts/abi/Socket.json";
import { overrides } from "./networks";
import {
  getDryRun,
  getMode,
  getProjectName,
  getProjectType,
  getToken,
  isSuperBridge,
} from "../constants/config";
import {
  ProjectAddresses,
  SuperTokenChainAddresses,
  SuperBridgeContracts,
  TokenAddresses,
  Hooks,
  SuperTokenProjectAddresses,
  ProjectType,
} from "../../src";
import { getIntegrationTypeConsts } from "./projectConstants";
import { readJSONFile } from "./utils";

export const deploymentsPath =
  getProjectType() === ProjectType.SUPERBRIDGE
    ? path.join(__dirname, `/../../deployments/superbridge/`)
    : path.join(__dirname, `/../../deployments/supertoken/`);

export interface DeployParams {
  addresses: TokenAddresses | SuperTokenChainAddresses;
  signer: Wallet;
  currentChainSlug: number;
  hook?: Hooks;
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
  let storedContactAddress = (deployUtils.addresses as TokenAddresses)
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

export const storeAddresses = async (
  addresses: TokenAddresses,
  chainSlug: ChainSlug,
  fileName: string,
  tokenName = getToken().toString(),
  pathToDeployments = deploymentsPath
) => {
  if (!fs.existsSync(pathToDeployments)) {
    await fs.promises.mkdir(pathToDeployments, { recursive: true });
  }

  const addressesPath =
    deploymentsPath + `${getMode()}_${getProjectName()}_addresses.json`;
  const outputExists = fs.existsSync(addressesPath);
  let deploymentAddresses: ProjectAddresses | SuperTokenProjectAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(addressesPath, "utf-8");
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  deploymentAddresses = createObj(
    deploymentAddresses,
    isSuperBridge()
      ? [chainSlug.toString(), getToken()]
      : [chainSlug.toString()],
    addresses
  );
  // deploymentAddresses[chainSlug][token] = addresses;
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
};

export const storeSuperTokenAddresses = async (
  addresses: SuperTokenChainAddresses,
  chainSlug: ChainSlug,
  fileName: string,
  tokenName = getToken().toString(),
  pathToDeployments = deploymentsPath
) => {
  if (!fs.existsSync(pathToDeployments)) {
    await fs.promises.mkdir(pathToDeployments, { recursive: true });
  }

  const addressesPath =
    deploymentsPath + `${getMode()}_${getProjectName()}_addresses.json`;
  const outputExists = fs.existsSync(addressesPath);
  let deploymentAddresses: SuperTokenProjectAddresses = {};
  if (outputExists) {
    const deploymentAddressesString = fs.readFileSync(addressesPath, "utf-8");
    deploymentAddresses = JSON.parse(deploymentAddressesString);
  }

  deploymentAddresses = createObj(
    deploymentAddresses,
    [chainSlug.toString()],
    addresses
  );
  // deploymentAddresses[chainSlug][token] = addresses;
  fs.writeFileSync(addressesPath, JSON.stringify(deploymentAddresses, null, 2));
};

export const storeAllAddresses = async (addresses: ProjectAddresses) => {
  if (!fs.existsSync(deploymentsPath)) {
    await fs.promises.mkdir(deploymentsPath, { recursive: true });
  }

  const addressesPath =
    deploymentsPath + `${getMode()}_${getProjectName()}_addresses.json`;
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
};

let addresses: ProjectAddresses;
let superTokenAddresses: SuperTokenProjectAddresses;
export const getSuperBridgeAddresses = async (): Promise<ProjectAddresses> => {
  let path =
    deploymentsPath + `${getMode()}_${getProjectName()}_addresses.json`;
  console.log({ path });
  let data;
  try {
    data = fs.readFileSync(path, "utf8");
  } catch (error) {
    console.log(error);
  }
  console.log({ data });
  try {
    return JSON.parse(data);
  } catch (error) {
    console.log(error);
  }

  console.log({ addresses });
  return addresses;
};

export const getSuperTokenAddresses =
  async (): Promise<SuperTokenProjectAddresses> => {
    console.log("here get supertoken ", { superTokenAddresses });
    if (!superTokenAddresses) {
      try {
        let path =
          deploymentsPath + `${getMode()}_${getProjectName()}_addresses.json`;
        console.log(path);
        let data;
        try {
          data = fs.readFileSync(path, "utf8");
        } catch (error) {
          console.log(error);
        }
        console.log("data", data);
        superTokenAddresses = JSON.parse(data);
        console.log("got data");
        console.log({ superTokenAddresses });
        console.log("superTokenAddresses", superTokenAddresses);
      } catch (e) {
        console.log("addresses not found", e);
        throw new Error("addresses not found");
      }
    }

    return superTokenAddresses;
  };

export const storeVerificationParams = async (
  verificationDetail: any[],
  chainSlug: ChainSlug
) => {
  if (!fs.existsSync(deploymentsPath)) {
    await fs.promises.mkdir(deploymentsPath);
  }
  const verificationPath =
    deploymentsPath + `${getMode()}_${getProjectName()}_verification.json`;
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
