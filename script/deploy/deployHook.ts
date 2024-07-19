import { Contract } from "ethers";
import { getOwner, isSuperBridge, isSuperToken } from "../constants/config";
import { getOrDeploy } from "../helpers";
import {
  Hooks,
  HookContracts,
  DeployParams,
  SBAddresses,
  STAddresses,
  STTokenAddresses,
  SBTokenAddresses,
  AppChainAddresses,
} from "../../src";
import { getBridgeContract } from "../helpers/common";
import { getDryRun } from "../constants/config";
import { constants } from "ethers";
const { AddressZero } = constants;

export const deployHookContracts = async (
  deployParams: DeployParams,
  allAddresses: SBAddresses | STAddresses,
  isControllerChain: boolean
) => {
  const hookType = deployParams.hookType;
  if (!hookType) return deployParams;

  let contractName: string = "";
  let path: string;
  let args: any[] = [];

  let bridgeContract: Contract, bridgeAddress: string;
  if (
    isSuperBridge() &&
    deployParams.mergeInboundWithTokens.length &&
    isControllerChain &&
    !deployParams.addresses[HookContracts.LimitHook] &&
    !(
      deployParams.addresses[HookContracts.LimitExecutionHook] &&
      deployParams.addresses[HookContracts.ExecutionHelper]
    )
  ) {
    for (const siblingToken of deployParams.mergeInboundWithTokens) {
      const siblingTokenAddr: AppChainAddresses =
        allAddresses[deployParams.currentChainSlug]?.[siblingToken];

      let LimitHookAddress = siblingTokenAddr?.[HookContracts.LimitHook];
      let LimitExecutionHookAddress =
        siblingTokenAddr?.[HookContracts.LimitExecutionHook];
      let ExecutionHelperAddress =
        siblingTokenAddr?.[HookContracts.ExecutionHelper];

      if (LimitHookAddress) {
        deployParams.addresses[HookContracts.LimitHook] = LimitHookAddress;
        console.log(
          `LimitHook found on ${deployParams.currentChainSlug} at address ${LimitHookAddress} for sibling token ${siblingToken}`
        );
      }
      if (ExecutionHelperAddress) {
        deployParams.addresses[HookContracts.ExecutionHelper] =
          ExecutionHelperAddress;
        console.log(
          `ExecutionHelper found on ${deployParams.currentChainSlug} at address ${ExecutionHelperAddress} for sibling token ${siblingToken}`
        );
      }
      if (LimitExecutionHookAddress) {
        deployParams.addresses[HookContracts.LimitExecutionHook] =
          LimitExecutionHookAddress;
        console.log(
          `LimitExecutionHook found on ${deployParams.currentChainSlug} at address ${LimitExecutionHookAddress} for sibling token ${siblingToken}`
        );
      }

      if (
        LimitHookAddress ||
        (LimitExecutionHookAddress && ExecutionHelperAddress)
      ) {
        return deployParams;
      }
    }
  }

  // no use of connectorPools for superToken
  let useConnnectorPools: boolean = false;
  if (isSuperToken()) useConnnectorPools = false;
  if (isSuperBridge()) useConnnectorPools = isControllerChain; // use pools only for controller chain

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
