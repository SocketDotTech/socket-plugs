import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { getSignerFromChainSlug } from "../../helpers/networks";
import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
} from "@socket.tech/dl-core";
import {
  getMode,
  getTokenProject,
  getSocketOwner,
  getToken,
} from "../../constants/config";
import {
  DeployParams,
  createObj,
  getProjectAddresses,
  getOrDeploy,
  storeAddresses,
  getOrDeployConnector,
  storeSuperTokenAddresses,
} from "../../helpers/utils";
import {
  SuperTokenControllerChainAddresses,
  CommonContracts,
  SuperTokenVaultChainAddresses,
  SuperTokenProjectAddresses,
  SuperTokenAddresses,
  Hooks,
  HookContracts,
  SuperTokenContracts,
  CommonContracts,
} from "../../../src";
import {
  isSuperTokenVaultChain,
  getSuperTokenConstants,
} from "../../helpers/constants";
import {
  ProjectTokenConstants,
  SuperTokenConstants,
} from "../../constants/types";
import { ExistingTokenAddresses } from "../../constants/existing-token-addresses";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: SuperTokenAddresses;
}

let tc: SuperTokenConstants;

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  console.log("========================================================");
  console.log("MODE", getMode());
  console.log("TOKEN PROJECT", getTokenProject());
  console.log("TOKEN", getToken());
  console.log(
    `Make sure ${getMode()}_${getTokenProject()}_addresses.json and ${getMode()}_${getTokenProject()}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${getSocketOwner()}`);
  console.log("========================================================");
  tc = getSuperTokenConstants();
  try {
    let addresses: SuperTokenProjectAddresses;
    try {
      addresses = await getProjectAddresses();
    } catch (error) {
      addresses = {} as SuperTokenProjectAddresses;
    }
    const allChains = [...tc.vaultChains, ...tc.superTokenChains];
    const hook = tc?.hook;
    await Promise.all(
      allChains.map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chain);

        let chainAddresses: SuperTokenAddresses = addresses[chain]?.[getToken()]
          ? (addresses[chain]?.[getToken()] as SuperTokenAddresses)
          : ({} as SuperTokenAddresses);

        const siblings = allChains.filter((c) => c !== chain);
        console.log({ siblings, hook });
        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            isSuperTokenVaultChain(chain),
            signer,
            chain,
            siblings,
            hook,
            chainAddresses
          );

          allDeployed = results.allDeployed;
          chainAddresses = results.deployedAddresses;
        }
      })
    );
  } catch (error) {
    console.log("Error in deploying contracts", error);
  }
};

/**
 * Deploys network-independent contracts
 */
const deploy = async (
  isVaultChain: boolean,
  socketSigner: Wallet,
  chainSlug: number,
  siblings: number[],
  hook: Hooks,
  deployedAddresses: SuperTokenAddresses
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
    hook,
  };

  try {
    const addr = deployUtils.addresses as SuperTokenAddresses;
    if (isVaultChain) {
      deployUtils = await deployVaultChainContracts(deployUtils);
    } else {
      deployUtils = await deployControllerChainContracts(deployUtils);
    }

    for (let sibling of siblings) {
      deployUtils = await deployConnectors(isVaultChain, sibling, deployUtils);
    }
    allDeployed = true;
    console.log(deployUtils.addresses);
    console.log("Contracts deployed!");
  } catch (error) {
    console.log(
      `Error in deploying setup contracts for ${deployUtils.currentChainSlug}`,
      error
    );
  }

  await storeSuperTokenAddresses(
    deployUtils.addresses as SuperTokenAddresses,
    deployUtils.currentChainSlug,
    `${getMode()}_${getTokenProject().toLowerCase()}_addresses.json`
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as SuperTokenAddresses,
  };
};

const deployConnectors = async (
  isSuperTokenVaultChain: boolean,
  sibling: ChainSlug,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams?.addresses) throw new Error("Addresses not found!");

    let integrationTypes: IntegrationTypes[];
    const socket: string = getAddresses(
      deployParams.currentChainSlug,
      getMode()
    ).Socket;
    let hub: string;
    const addr: SuperTokenAddresses =
      deployParams.addresses as SuperTokenAddresses;
    if (isSuperTokenVaultChain) {
      const a = addr as SuperTokenControllerChainAddresses;
      if (!a.Controller) throw new Error("Controller not found!");
      hub = a.Controller;
      integrationTypes = Object.keys(tc.limits[sibling]) as IntegrationTypes[];
    } else {
      const a = addr as SuperTokenVaultChainAddresses;
      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
      integrationTypes = Object.keys(
        tc.limits[deployParams.currentChainSlug]
      ) as IntegrationTypes[];
    }

    for (let intType of integrationTypes) {
      console.log(hub, socket, sibling);
      const connector: Contract = await getOrDeployConnector(
        [hub, socket, sibling],
        deployParams,
        sibling,
        intType
      );

      console.log("connectors", sibling.toString(), intType, connector.address);

      deployParams.addresses = createObj(
        deployParams.addresses,
        ["connectors", sibling.toString(), intType],
        connector.address
      );
    }

    console.log(deployParams.addresses);
    console.log("Connector Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying connector contracts", error);
  }

  return deployParams;
};

const deployVaultChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  console.log(
    `Deploying vault chain contracts for ${getToken()}, chain: ${
      deployParams.currentChainSlug
    }...`
  );
  try {
    const nonMintableToken =
      deployParams.addresses[CommonContracts.NonMintableToken] ??
      ExistingTokenAddresses[deployParams.currentChainSlug]?.[getToken()];
    if (!nonMintableToken)
      throw new Error(
        `Token not found on chain ${deployParams.currentChainSlug}`
      );
    console.log("nonMintableToken", nonMintableToken);
    const vault: Contract = await getOrDeploy(
      CommonContracts.Vault,
      "contracts/hub/Vault.sol",
      [nonMintableToken],
      deployParams
    );
    deployParams.addresses[CommonContracts.Vault] = vault.address;
    console.log(deployParams.addresses);

    deployParams = await deployHookContracts(false, deployParams);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployControllerChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    await deploySuperToken(deployParams);

    const controller: Contract = await getOrDeploy(
      CommonContracts.Controller,
      "contracts/hub/Controller.sol",
      [],
      deployParams
    );
    deployParams.addresses[CommonContracts.Controller] = controller.address;

    deployParams = await deployHookContracts(true, deployParams);

    console.log(deployParams.addresses);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployHookContracts = async (
  isSuperTokenVaultChain: boolean,
  deployParams: DeployParams
) => {
  const hook = deployParams.hook;
  if (!hook) return deployParams;

  let contractName: string;
  let path: string;
  let args: any[] = [];
  if (hook == Hooks.LIMIT_HOOK) {
    contractName = HookContracts.LimitHook;
    args = [
      getSocketOwner(),
      isSuperTokenVaultChain
        ? deployParams.addresses[CommonContracts.Controller]
        : deployParams.addresses[CommonContracts.Vault],
      isSuperTokenVaultChain, // useControllerPools
    ];
  } else if (hook == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;

    deployParams = await deployExecutionHelper(deployParams);

    args = [
      getSocketOwner(),
      isSuperTokenVaultChain
        ? deployParams.addresses[CommonContracts.Controller]
        : deployParams.addresses[CommonContracts.Vault],
      deployParams.addresses[HookContracts.ExecutionHelper],
      isSuperTokenVaultChain, // useControllerPools
    ];
  }
  //  else if (hook == Hooks.YIELD_LIMIT_EXECUTION_HOOK) {
  //   if (isSuperTokenVaultChain) {
  //     contractName = HookContracts.ControllerYieldLimitExecutionHook;
  //     args = [
  //       tc.hookInfo?.yieldToken,
  //       isSuperTokenVaultChain
  //         ? deployParams.addresses[CommonContracts.Controller]
  //         : deployParams.addresses[CommonContracts.Vault]
  //     ];
  //   } else {
  //     contractName = HookContracts.VaultYieldLimitExecutionHook;
  //   }
  // }

  if (!contractName) return deployParams;

  path = `contracts/hooks/${contractName}.sol`;

  const hookContract: Contract = await getOrDeploy(
    contractName,
    path,
    args,
    deployParams
  );
  deployParams.addresses[contractName] = hookContract.address;

  console.log(deployParams.addresses);
  console.log("Hook Contracts deployed!");

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

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
