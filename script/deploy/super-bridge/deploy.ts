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
  getSuperBridgeProject,
  getProjectType,
  getSocketOwner,
  getToken,
} from "../../constants/config";
import {
  DeployParams,
  createObj,
  getSuperBridgeAddresses,
  getOrDeploy,
  storeAddresses,
  getOrDeployConnector,
} from "../../helpers/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
  Hooks,
  HookContracts,
  ProjectType,
  Project,
} from "../../../src";
import {
  isAppChain,
  getBridgeProjectTokenConstants,
  getSuperTokenConstants,
} from "../../helpers/constants";
import { ProjectTokenConstants } from "../../constants/types";
import { ExistingTokenAddresses } from "../../constants/existing-token-addresses";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

let projectType: ProjectType;
let pc: ProjectTokenConstants;

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  console.log("========================================================");
  console.log("MODE", getMode());
  projectType = getProjectType();
  console.log("PROJECT", getSuperBridgeProject());
  console.log("TOKEN", getToken());
  console.log(
    `Make sure ${getMode()}_${getSuperBridgeProject()}_addresses.json and ${getMode()}_${getSuperBridgeProject()}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${getSocketOwner()}`);
  console.log("========================================================");
  if (projectType == ProjectType.SUPERBRIDGE)
    pc = getBridgeProjectTokenConstants();
  else if (projectType == ProjectType.SUPERTOKEN) pc = getSuperTokenConstants();

  try {
    let addresses: ProjectAddresses;
    try {
      addresses = await getSuperBridgeAddresses();
    } catch (error) {
      addresses = {} as ProjectAddresses;
    }
    const allChains = [...pc.vaultChains, ...pc.superTokenChains];
    const hook = pc?.hook;
    await Promise.all(
      allChains.map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chain);

        let chainAddresses: TokenAddresses = addresses[chain]?.[getToken()]
          ? (addresses[chain]?.[getToken()] as TokenAddresses)
          : ({} as TokenAddresses);

        let siblings: ChainSlug[];
        if (projectType == ProjectType.SUPERBRIDGE)
          siblings = isAppChain(chain) ? pc.nonAppChains : [pc.appChain];
        else if (projectType == ProjectType.SUPERTOKEN)
          siblings = allChains.filter((c) => c !== chain);

        // console.log({ siblings, hook });
        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            isAppChain(chain),
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
  isAppChain: boolean,
  socketSigner: Wallet,
  chainSlug: number,
  siblings: number[],
  hook: Hooks,
  deployedAddresses: TokenAddresses
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
    hook,
  };

  try {
    const addr = deployUtils.addresses as TokenAddresses;
    if (projectType == ProjectType.SUPERBRIDGE) {
      addr.isAppChain = isAppChain;
    }
    if (isAppChain) {
      deployUtils = await deployAppChainContracts(deployUtils);
    } else {
      deployUtils = await deployNonAppChainContracts(deployUtils);
    }

    for (let sibling of siblings) {
      deployUtils = await deployConnectors(sibling, deployUtils);
    }
    allDeployed = true;
    // console.log(deployUtils.addresses);
    console.log("Contracts deployed!");
  } catch (error) {
    console.log(
      `Error in deploying setup contracts for ${deployUtils.currentChainSlug}`,
      error
    );
  }

  await storeAddresses(
    deployUtils.addresses as TokenAddresses,
    deployUtils.currentChainSlug,
    `${getMode()}_${getSuperBridgeProject().toLowerCase()}_addresses.json`
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as TokenAddresses,
  };
};

const deployConnectors = async (
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
    const addr: TokenAddresses = deployParams.addresses as TokenAddresses;
    if (addr.isAppChain) {
      const a = addr as AppChainAddresses;
      if (!a.Controller) throw new Error("Controller not found!");
      hub = a.Controller;
      integrationTypes = Object.keys(pc.limits[sibling]) as IntegrationTypes[];
    } else {
      const a = addr as NonAppChainAddresses;
      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
      integrationTypes = Object.keys(
        pc.limits[deployParams.currentChainSlug]
      ) as IntegrationTypes[];
    }

    for (let intType of integrationTypes) {
      // console.log(hub, socket, sibling);
      const connector: Contract = await getOrDeployConnector(
        [hub, socket, sibling],
        deployParams,
        sibling,
        intType
      );

      // console.log("connectors", sibling.toString(), intType, connector.address);

      deployParams.addresses = createObj(
        deployParams.addresses,
        ["connectors", sibling.toString(), intType],
        connector.address
      );
    }

    // console.log(deployParams.addresses);
    console.log("Connector Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying connector contracts", error);
  }

  return deployParams;
};

const deployAppChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses[SuperBridgeContracts.MintableToken])
      throw new Error("Token not found on app chain");

    const controller: Contract = await getOrDeploy(
      pc.isFiatTokenV2_1
        ? SuperBridgeContracts.FiatTokenV2_1_Controller
        : SuperBridgeContracts.Controller,
      pc.isFiatTokenV2_1
        ? "contracts/hub/FiatTokenV2_1/FiatTokenV2_1_Controller.sol"
        : "contracts/hub/Controller.sol",
      [deployParams.addresses[SuperBridgeContracts.MintableToken]],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Controller] =
      controller.address;

    deployParams = await deployHookContracts(true, deployParams);

    // console.log(deployParams.addresses);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployNonAppChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  console.log(
    `Deploying non app chain contracts for ${getToken()}, chain: ${
      deployParams.currentChainSlug
    }...`
  );
  try {
    const nonMintableToken =
      deployParams.addresses[SuperBridgeContracts.NonMintableToken] ??
      ExistingTokenAddresses[deployParams.currentChainSlug]?.[getToken()];
    if (!nonMintableToken)
      throw new Error(
        `Token not found on chain ${deployParams.currentChainSlug}`
      );
    console.log("nonMintableToken", nonMintableToken);
    if (!deployParams.addresses[SuperBridgeContracts.NonMintableToken])
      deployParams.addresses[SuperBridgeContracts.NonMintableToken] =
        nonMintableToken;

    const vault: Contract = await getOrDeploy(
      SuperBridgeContracts.Vault,
      "contracts/hub/Vault.sol",
      [nonMintableToken],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Vault] = vault.address;
    // console.log(deployParams.addresses);

    deployParams = await deployHookContracts(false, deployParams);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployHookContracts = async (
  isAppChain: boolean,
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
      isAppChain
        ? deployParams.addresses[SuperBridgeContracts.Controller]
        : deployParams.addresses[SuperBridgeContracts.Vault],
      isAppChain, // useControllerPools
    ];
  } else if (hook == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;

    deployParams = await deployExecutionHelper(deployParams);

    args = [
      getSocketOwner(),
      isAppChain
        ? deployParams.addresses[SuperBridgeContracts.Controller]
        : deployParams.addresses[SuperBridgeContracts.Vault],
      deployParams.addresses[HookContracts.ExecutionHelper],
      isAppChain, // useControllerPools
    ];
  }
  //  else if (hook == Hooks.YIELD_LIMIT_EXECUTION_HOOK) {
  //   if (isAppChain) {
  //     contractName = HookContracts.ControllerYieldLimitExecutionHook;
  //     args = [
  //       pc.hookInfo?.yieldToken,
  //       isAppChain
  //         ? deployParams.addresses[SuperBridgeContracts.Controller]
  //         : deployParams.addresses[SuperBridgeContracts.Vault]
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

  // console.log(deployParams.addresses);
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
