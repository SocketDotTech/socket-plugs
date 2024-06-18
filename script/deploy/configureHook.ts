import { Contract, Wallet } from "ethers";

import { ChainSlug } from "@socket.tech/dl-core";
import { getInstance, execute } from "../helpers";
import {
  Connectors,
  HookContracts,
  SBTokenAddresses,
  STTokenAddresses,
} from "../../src";
import { getHookContract, updateLimitsAndPoolId } from "../helpers/common";
import { Tokens } from "../../src/enums";
import { getDryRun } from "../constants/config";
import { constants } from "ethers";
const { AddressZero } = constants;

export const configureHooks = async (
  chain: ChainSlug,
  token: Tokens,
  bridgeContract: Contract,
  socketSigner: Wallet,
  siblingSlugs: ChainSlug[],
  connectors: Connectors,
  addr: SBTokenAddresses | STTokenAddresses
) => {
  let { hookContract, hookContractName } = await getHookContract(
    chain,
    token,
    addr
  );
  if (!hookContract || !hookContractName) {
    return; // No hook to configure
  }

  if (hookContractName === HookContracts.LimitExecutionHook) {
    await setHookInExecutionHelper(chain, socketSigner, hookContract, addr);
  }
  await setHookInBridge(chain, bridgeContract, hookContract);

  if (
    [HookContracts.LimitHook, HookContracts.LimitExecutionHook].includes(
      hookContractName as HookContracts
    )
  ) {
    await updateLimitsAndPoolId(
      chain,
      token,
      siblingSlugs,
      addr,
      connectors,
      hookContract
    );
  }
};

// export const setLimitUpdaterRole = async (
//   chain: ChainSlug,
//   hookContract: Contract
// ) => {
//   await checkAndGrantRole(
//     chain,
//     hookContract,
//     "limit updater",
//     LIMIT_UPDATER_ROLE,
//     getOwner()
//   );
// };

export const setHookInBridge = async (
  chain: ChainSlug,
  bridgeContract: Contract,
  hookContract: Contract
) => {
  let storedHookAddress = getDryRun()
    ? AddressZero
    : await bridgeContract.hook__();
  if (storedHookAddress === hookContract.address) {
    console.log(`✔   Hook already set on Bridge for chain ${chain}`);
    return;
  }
  await execute(
    bridgeContract,
    "updateHook",
    [hookContract.address, false],
    chain
  );
};

export const setHookInExecutionHelper = async (
  chain: ChainSlug,
  socketSigner: Wallet,
  hookContract: Contract,
  addr: SBTokenAddresses | STTokenAddresses
) => {
  let address = addr[HookContracts.ExecutionHelper];
  if (!address) {
    throw new Error("Execution Helper address not found");
  }
  let executionHelperContract = await getInstance(
    HookContracts.ExecutionHelper,
    address
  );
  executionHelperContract = executionHelperContract.connect(socketSigner);

  let storedHookAddress = await executionHelperContract.hook();
  if (storedHookAddress === hookContract.address) {
    console.log(`✔   Hook already set on Execution Helper for chain ${chain}`);
    return;
  }
  await execute(
    executionHelperContract,
    "setHook",
    [hookContract.address],
    chain
  );
};
