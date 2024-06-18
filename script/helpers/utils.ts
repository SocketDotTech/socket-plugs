import { Contract } from "ethers";

import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { getProviderFromChainSlug, overrides } from "./networks";
import {
  getDryRun,
  getMode,
  getProjectName,
  getProjectType,
} from "../constants/config";
import * as fs from "fs";
import path from "path";

import { getIntegrationTypeConsts } from "./projectConstants";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

import { ProjectType } from "../../src";

export const getAllDeploymentPath = (
  projectType: ProjectType = getProjectType()
) => {
  return path.join(
    __dirname,
    `/../../deployments/${projectType}/${getMode()}_addresses.json`
  );
};

export let deploymentPath: string;
export const getDeploymentPath = () => {
  if (deploymentPath) return deploymentPath;
  deploymentPath = path.join(
    __dirname,
    `/../../deployments/${getProjectType()}/${getMode()}_${getProjectName()}_addresses.json`
  );
  return deploymentPath;
};

export let verificationPath: string;
export const getVerificationPath = () => {
  if (verificationPath) return verificationPath;
  verificationPath = path.join(
    __dirname,
    `/../../deployments/${getProjectType()}/${getMode()}_${getProjectName()}_verification.json`
  );
  return verificationPath;
};

export let constantPath: string;
export const getConstantPath = () => {
  if (constantPath) return constantPath;
  constantPath = path.join(
    __dirname,
    `/../constants/projectConstants/${getProjectType()}/${getProjectName()}`
  );
  return constantPath;
};

export const getConstantPathForProject = (
  projectName: string,
  projectType: ProjectType
) => {
  return path.join(
    __dirname,
    `/../constants/projectConstants/${projectType}/${projectName}`
  );
};

export function encodePoolId(chainSlug: number, poolCount: number) {
  const encodedValue = (BigInt(chainSlug) << BigInt(224)) | BigInt(poolCount);

  // Ensure the result is a 32-byte hex string (bytes32 in Solidity)
  const resultHex = encodedValue.toString(16).padStart(64, "0");
  return "0x" + resultHex;
}

export const getPoolIdHex = (
  chainSlug: ChainSlug,
  token: string,
  it: IntegrationTypes
): string => {
  // use 0 as default for poolCount, merging all volume from a single chain
  let poolCount =
    getIntegrationTypeConsts(it, chainSlug, token)?.poolCount ?? 0;
  return encodePoolId(chainSlug, poolCount);
};

export async function getOwnerAndNominee(contract: Contract) {
  const owner = await contract.owner();
  try {
    const nominee = await contract.nominee();
    return [owner, nominee, 0];
  } catch (error) {}
  const pendingOwner = await contract.pendingOwner();
  return [owner, pendingOwner, 1];
}

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const execSummary: string[] = [];

export async function execute(
  contract: Contract,
  method: string,
  args: any[],
  chain: number
) {
  if (getDryRun()) {
    execSummary.push("");
    execSummary.push(
      `DRY RUN - Call '${method}' on ${contract.address} on chain ${chain} with args:`
    );
    args.forEach((a) => execSummary.push(a));
    execSummary.push(
      "RAW CALLDATA - " +
        (await contract.populateTransaction[method](...args)).data
    );
    execSummary.push("");
  } else {
    let tx = await contract.functions[method](...args, {
      ...overrides[chain],
    });
    console.log(
      `o   Sent on chain: ${chain} function: ${method} txHash: ${tx.hash}`
    );
    await tx.wait();
  }
}

export const printExecSummary = () => {
  if (execSummary.length) {
    console.log("=".repeat(100));
    execSummary.forEach((t) => console.log(t));
    console.log("=".repeat(100));
  }
};

// Function to read JSON file
export const readJSONFile = (filePath: string) => {
  try {
    let fileExists = fs.existsSync(filePath);
    if (!fileExists) {
      return {};
    }
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return null;
  }
};

export const checkMissingFields = (fields: { [key: string]: any }) => {
  for (const field in fields) {
    let value = fields[field];
    if (value === undefined || value === null) {
      throw Error(`missing field : ${field}`);
    }
  }
};

export const isContractAtAddress = async (
  provider: StaticJsonRpcProvider,
  address: string
) => {
  const code = await provider.getCode(address);
  // console.log({ code });
  if (code === "0x") {
    return false;
  }
  return true;
};
