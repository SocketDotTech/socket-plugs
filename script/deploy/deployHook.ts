import { Contract } from "ethers";
import { getOwner, isSuperBridge, isSuperToken } from "../constants/config";
import { getOrDeploy } from "../helpers";
import { Hooks, HookContracts, DeployParams } from "../../src";
import { getBridgeContract } from "../helpers/common";
import { kintoConfig } from "@kinto-utils/dist/utils/constants";
import { isKinto } from "@kinto-utils/dist/kinto";

export const deployHookContracts = async (
  useConnnectorPools: boolean,
  deployParams: DeployParams
) => {
  const hookType = deployParams.hookType;
  if (!hookType) return deployParams;

  let contractName: string = "";
  let path: string;
  let args: any[] = [];

  let bridgeContract: Contract, bridgeAddress: string;

  // no use of connectorPools for superToken
  useConnnectorPools = isSuperToken() ? false : useConnnectorPools;

  bridgeContract = await getBridgeContract(
    deployParams.currentChainSlug,
    deployParams.currentToken,
    deployParams.addresses
  );
  bridgeAddress = bridgeContract.address;

  if (hookType == Hooks.LIMIT_HOOK) {
    contractName = HookContracts.LimitHook;
    args = [
      isKinto(deployParams.currentChainSlug)
        ? process.env.KINTO_OWNER_ADDRESS
        : getOwner(),
      bridgeAddress,
      useConnnectorPools, // useControllerPools
    ];
  } else if (hookType == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;
    deployParams = await deployExecutionHelper(deployParams);
    args = [
      isKinto(deployParams.currentChainSlug)
        ? process.env.KINTO_OWNER_ADDRESS
        : getOwner(),
      bridgeAddress,
      deployParams.addresses[HookContracts.ExecutionHelper],
      useConnnectorPools, // useControllerPools
    ];
  } else if (hookType == Hooks.KINTO_HOOK) {
    // if chain is Kinto (Controller), we deploy the KintoHook, otherwise, we deploy the SenderHook (for Vaults)
    if (isKinto(deployParams.currentChainSlug)) {
      contractName = HookContracts.KintoHook;
      args = [
        process.env.KINTO_OWNER_ADDRESS,
        bridgeAddress,
        useConnnectorPools, // useControllerPools
        kintoConfig[deployParams.currentChainSlug].contracts.kintoID.address,
        kintoConfig[deployParams.currentChainSlug].contracts.factory.address,
      ];
    } else {
      contractName = HookContracts.SenderHook;
      args = [getOwner(), bridgeAddress, useConnnectorPools];
    }
  }

  if (!contractName) return deployParams;

  path = `contracts/hooks/${contractName}.sol`;

  const hookContract: Contract = await getOrDeploy(
    contractName,
    path,
    args,
    deployParams
  );
  deployParams.addresses[contractName] = hookContract.address;

  // console.log(deployParams.addresses);
  console.log(deployParams.currentChainSlug, "Hook Contracts deployed! ✔");

  return deployParams;
};

const deployExecutionHelper = async (deployParams: DeployParams) => {
  let contractName = HookContracts.ExecutionHelper;
  let path = `contracts/hooks/plugins/${contractName}.sol`;

  const executionHelperContract: Contract = await getOrDeploy(
    contractName,
    path,
    [getOwner()],
    deployParams
  );
  deployParams.addresses[contractName] = executionHelperContract.address;
  return deployParams;
};
