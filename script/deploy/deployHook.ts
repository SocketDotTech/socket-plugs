import { Contract } from "ethers";
import { getOwner, isSuperBridge, isSuperToken } from "../constants/config";
import { getOrDeploy } from "../helpers";
import { Hooks, HookContracts, DeployParams } from "../../src";
import { getBridgeContract } from "../helpers/common";
import { getDryRun } from "../constants/config";
import { constants } from "ethers";
const { AddressZero } = constants;

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
      getOwner(),
      bridgeAddress,
      useConnnectorPools, // useControllerPools
    ];
  } else if (hookType == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;
    deployParams = await deployExecutionHelper(deployParams);
    args = [
      getOwner(),
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
  deployParams.addresses[contractName] = getDryRun()
    ? AddressZero
    : hookContract.address;

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
