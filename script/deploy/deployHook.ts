import { Contract } from "ethers";
import {
  getSocketOwner,
  isSuperBridge,
  isSuperToken,
} from "../constants/config";
import { getOrDeploy } from "../helpers";
import { Hooks, HookContracts, DeployParams } from "../../src";
import { getBridgeContract } from "../helpers/common";

export const deployHookContracts = async (
  isVaultChain: boolean,
  useConnnectorPools: boolean,
  deployParams: DeployParams
) => {
  const hookType = deployParams.hookType;
  if (!hookType) return deployParams;

  let contractName: string;
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
      getSocketOwner(),
      bridgeAddress,
      useConnnectorPools, // useControllerPools
    ];
  } else if (hookType == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;
    deployParams = await deployExecutionHelper(deployParams);
    args = [
      getSocketOwner(),
      bridgeAddress,
      deployParams.addresses[HookContracts.ExecutionHelper],
      useConnnectorPools, // useControllerPools
    ];
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
    [getSocketOwner()],
    deployParams
  );
  deployParams.addresses[contractName] = executionHelperContract.address;
  return deployParams;
};
