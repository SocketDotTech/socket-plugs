import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";
import { ContractFactory, Contract } from "ethers";

import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { getSignerFromChainSlug, overrides } from "./networks";
import { getDryRun } from "../constants/config";
import * as fs from "fs";

import { getIntegrationTypeConsts } from "./projectConstants";
import { getInstance } from "./deployUtils";
import {
  CommonContracts,
  SuperBridgeContracts,
  SuperTokenChainAddresses,
  TokenAddresses,
} from "../../src";

export function encodePoolId(chainSlug: number, poolCount: number) {
  const encodedValue = (BigInt(chainSlug) << BigInt(224)) | BigInt(poolCount);

  // Ensure the result is a 32-byte hex string (bytes32 in Solidity)
  const resultHex = encodedValue.toString(16).padStart(64, "0");
  return "0x" + resultHex;
}

export const getPoolIdHex = (
  chainSlug: ChainSlug,
  it: IntegrationTypes
): string => {
  return encodePoolId(
    chainSlug,
    getIntegrationTypeConsts(it, chainSlug).poolCount
  );
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

export const execSummary = [];

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

export const getBridgeContract = async (
  chain: ChainSlug,
  addr: TokenAddresses | SuperTokenChainAddresses
) => {
  const socketSigner = getSignerFromChainSlug(chain);

  let bridgeContract: Contract;
  let vaultAddress = addr[CommonContracts.Vault];
  let controllerAddress = addr[CommonContracts.Controller];

  if (vaultAddress && controllerAddress) {
    throw new Error("Both vault and controller addresses found");
  }
  if (!vaultAddress && !controllerAddress) {
    throw new Error("vault and controller addresses not found");
  }
  if (addr[CommonContracts.Controller]) {
    bridgeContract = await getInstance(
      SuperBridgeContracts.Controller,
      addr[SuperBridgeContracts.Controller]
    );
  } else if (addr[CommonContracts.Vault]) {
    bridgeContract = await getInstance(
      SuperBridgeContracts.Vault,
      addr[SuperBridgeContracts.Vault]
    );
  }

  bridgeContract = bridgeContract.connect(socketSigner);
  return bridgeContract;
};

// Function to read JSON file
export function readJSONFile(filePath: string): Promise<any> {
  try {
    // Read file synchronously
    console.log("readiang file");
    const data = fs.readFileSync(filePath, "utf8");
    console.log("file ", data);
    console.log(JSON.parse(data));
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading JSON file:", error);
    return null;
  }
}
