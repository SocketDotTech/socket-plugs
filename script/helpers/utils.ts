import { Contract, EventFilter } from "ethers";

import {
  ChainSlug,
  ChainSlugToKey,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { overrides } from "./networks";
import {
  getDryRun,
  getMode,
  getProjectName,
  getProjectType,
} from "../constants/config";
import * as fs from "fs";
import path from "path";

import { getIntegrationTypeConsts } from "./projectConstants";
import { ProjectType } from "../../src";
import { handleOps, isKinto } from "@kinto-utils/dist/kinto";
import { LEDGER } from "@kinto-utils/dist/utils/constants";
import { ethers } from "hardhat";

export let allDeploymentPath: string;
export const getAllDeploymentPath = () => {
  if (allDeploymentPath) return allDeploymentPath;
  allDeploymentPath = path.join(
    __dirname,
    `/../../deployments/${getProjectType()}/${getMode()}_addresses.json`
  );
  return allDeploymentPath;
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
  let owner;
  try {
    owner = await contract.owner();
  } catch (error) {
    return [null, null, null];
  }
  try {
    const nominee = await contract.nominee();
    return [owner, nominee, 0];
  } catch (error) {}
  const pendingOwner = await contract.pendingOwner();
  return [owner, pendingOwner, 1];
}

export async function getRoleMembers(contract: Contract, roleToQuery: string) {
  const roleMembers = new Map<string, number>();

  // only for BridgedToken contracts
  let roleGrantedBridgedTokenEvents = [];
  let roleRevokedBridgedTokenEvents = [];
  try {
    const roleGrantedBridgedTokenFilter: EventFilter = contract.filters[
      "RoleGranted(bytes32,address,address)"
    ](roleToQuery, null, null);
    const roleRevokedBridgedTokenFilter: EventFilter = contract.filters[
      "RoleRevoked(bytes32,address,address)"
    ](roleToQuery, null, null);
    roleGrantedBridgedTokenEvents = await contract.queryFilter(
      roleGrantedBridgedTokenFilter
    );
    roleRevokedBridgedTokenEvents = await contract.queryFilter(
      roleRevokedBridgedTokenFilter
    );

    roleGrantedBridgedTokenEvents.forEach((event) => {
      const grantee = event.args.account;
      roleMembers.set(grantee, (roleMembers.get(grantee) || 0) + 1);
    });

    roleRevokedBridgedTokenEvents.forEach((event) => {
      const revokee = event.args.account;
      const count = roleMembers.get(revokee) || 0;
      if (count > 0) {
        roleMembers.set(revokee, count - 1);
      }
    });
  } catch (e) {}

  try {
    const roleGrantedFilter: EventFilter = contract.filters[
      "RoleGranted(bytes32,address)"
    ](roleToQuery, null);
    const roleRevokedFilter: EventFilter = contract.filters[
      "RoleRevoked(bytes32,address)"
    ](roleToQuery, null);

    const roleGrantedEvents = await contract.queryFilter(roleGrantedFilter);
    const roleRevokedEvents = await contract.queryFilter(roleRevokedFilter);

    roleGrantedEvents.forEach((event) => {
      const grantee = event.args.grantee;
      roleMembers.set(grantee, (roleMembers.get(grantee) || 0) + 1);
    });

    roleRevokedEvents.forEach((event) => {
      const revokee = event.args.revokee;
      const count = roleMembers.get(revokee) || 0;
      if (count > 0) {
        roleMembers.set(revokee, count - 1);
      }
    });
  } catch (e) {}

  const members = Array.from(roleMembers.entries()).filter(
    ([_, count]) => count > 0
  );
  return members.map(([address, _]) => address);
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
    let tx;
    let txRequest = await contract.populateTransaction[method](...args, {
      ...overrides[chain],
    });

    if (isKinto(chain)) {
      tx = await handleOps({
        kintoWalletAddr: process.env.KINTO_OWNER_ADDRESS,
        userOps: [txRequest],
        privateKeys: [`0x${process.env.OWNER_SIGNER_KEY}`, LEDGER],
      });
      console.log(
        `o   Sent on chain: ${chain} function: ${method} txHash: ${tx.transactionHash}`
      );
    } else {
      const safe = process.env[ChainSlugToKey[chain].toUpperCase() + "_SAFE"];
      const [owner, nominee] = await getOwnerAndNominee(contract);

      // if contract owner is the SAFE, add to batch
      // if contract owner is not the SAFE, send transaction
      // TODO: check if sender has the necessary role to do it
      // or we just assume the SAFE always has the necessary roles.
      if (
        (method === "claimOwner" &&
          nominee.toLowerCase() === safe.toLowerCase()) ||
        owner.toLowerCase() == safe.toLowerCase()
      ) {
        // console.log(`   -   Owner of ${contract.address} is Gnosis Safe`);
        console.log(
          YELLOW,
          `   ✔   Added tx with method: '${method}' for chain: ${chain} to the Gnosis Safe batch`
        );
        let jsonData = {};

        if (fs.existsSync("safe_transactions.json")) {
          // read the existing content
          jsonData = JSON.parse(
            fs.readFileSync("safe_transactions.json", "utf-8")
          );
          // append new transactions
          jsonData[chain] = jsonData[chain]
            ? (jsonData[chain] = [...jsonData[chain], txRequest])
            : [txRequest];
        } else {
          // create a new JSON object
          jsonData = {
            [chain]: [txRequest],
          };
        }
        fs.writeFileSync(
          "safe_transactions.json",
          JSON.stringify(jsonData, null, 2)
        );
      } else {
        tx = await (await contract.signer.sendTransaction(txRequest)).wait();
        console.log(
          `o   Sent on chain: ${chain} function: ${method} txHash: ${tx.transactionHash}`
        );
      }
    }
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

export const removeSafeTransactionsFile = () => {
  if (fs.existsSync("safe_transactions.json")) {
    fs.unlinkSync("safe_transactions.json");
  }
};

export const createBatchFiles = () => {
  let existingData: Object = {};
  if (fs.existsSync("safe_transactions.json")) {
    existingData = JSON.parse(
      fs.readFileSync("safe_transactions.json", "utf-8")
    );
  } else {
    console.log("\nNo transactions to execute on Gnosis Safe.");
    return;
  }

  const chains = Object.keys(existingData);
  const batchFiles = [];
  console.log(YELLOW, "=".repeat(100));
  for (let chain of chains) {
    const transactions = existingData[chain].map((tx) => {
      return getTx(tx.to, tx.method, tx.data);
    });
    const date = new Date().toISOString();
    const chainId = chain;
    const name = `batch_${chain}_${date}`;
    const safe = process.env[ChainSlugToKey[chain].toUpperCase() + "_SAFE"];
    const safeChain =
      chainId == "1"
        ? "eth"
        : chainId == "8453"
        ? "base"
        : chainId == "42161"
        ? "arb"
        : "null";
    const file = {
      version: "1.0",
      chainId,
      createdAt: date,
      meta: {
        name,
        description: "",
        txBuilderVersion: "1.16.3",
        createdFromSafeAddress: safe,
        createdFromOwnerAddress: "",
        checksum: "",
      },
      transactions,
    };
    file.meta.checksum = calculateChecksum(file);
    const jsonString = JSON.stringify(file);
    fs.writeFileSync(`${name}.json`, jsonString);
    batchFiles.push(`${name}.json`);
    console.log(YELLOW, `✔   Batch file created: [${batchFiles}]`);
    console.log(
      YELLOW,
      `!!  Please, upload file on Gnosis Safe Transaction Builder: https://app.safe.global/apps/open?safe=${safeChain}:${safe}&appUrl=https://apps-portal.safe.global/tx-builder}`
    );
  }
  fs.unlinkSync("safe_transactions.json");
  console.log(YELLOW, "=".repeat(100));
};

const getTx = (to, method, data) => {
  return {
    to,
    value: "0",
    data,
    method,
    operation: "1",
    contractMethod: null,
    contractInputsValues: null,
  };
};

const stringifyReplacer = (_, value) => (value === undefined ? null : value);

const serializeJSONObject = (json) => {
  if (Array.isArray(json)) {
    return `[${json.map((el) => serializeJSONObject(el)).join(",")}]`;
  }

  if (typeof json === "object" && json !== null) {
    let acc = "";
    const keys = Object.keys(json).sort();
    acc += `{${JSON.stringify(keys, stringifyReplacer)}`;

    for (let i = 0; i < keys.length; i++) {
      acc += `${serializeJSONObject(json[keys[i]])},`;
    }

    return `${acc}}`;
  }

  return `${JSON.stringify(json, stringifyReplacer)}`;
};

const calculateChecksum = (batchFile) => {
  const serialized = serializeJSONObject({
    ...batchFile,
    meta: { ...batchFile.meta },
  });
  const sha = ethers.utils.soliditySha256(["string"], [serialized]);

  return sha || undefined;
};

const YELLOW = "\x1b[33m%s\x1b[0m";
