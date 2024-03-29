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
  getSuperBridgeAddresses,
  getOrDeploy,
  storeAddresses,
  getOrDeployConnector,
  storeSuperTokenAddresses,
  getSuperTokenAddresses,
} from "../../helpers";
import {
  SuperTokenControllerChainAddresses,
  SuperTokenVaultChainAddresses,
  SuperTokenProjectAddresses,
  Hooks,
  HookContracts,
  SuperTokenContracts,
  CommonContracts,
  SuperTokenChainAddresses,
} from "../../../src";
import {
  isSuperTokenVaultChain,
  getSuperTokenConstants,
} from "../../helpers/projectConstants";
import {
  ProjectTokenConstants,
  SuperTokenConstants,
} from "../../constants/types";
import { ExistingTokenAddresses } from "../../constants/existing-token-addresses";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: SuperTokenChainAddresses;
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
  // console.log(tc);
  try {
    let addresses: SuperTokenProjectAddresses;
    try {
      addresses = await getSuperTokenAddresses();
    } catch (error) {
      addresses = {} as SuperTokenProjectAddresses;
    }
    const allChains = [...tc.vaultChains, ...tc.superTokenChains];
    const hook = tc?.hook;
    await Promise.all(
      allChains.map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chain);

        let chainAddresses: SuperTokenChainAddresses = addresses[chain]
          ? (addresses[chain] as SuperTokenChainAddresses)
          : ({} as SuperTokenChainAddresses);

        const siblings = allChains.filter((c) => c !== chain);
        // console.log({ siblings, hook });
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
  deployedAddresses: SuperTokenChainAddresses
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
    hook,
  };

  try {
    const addr = deployUtils.addresses as SuperTokenChainAddresses;
    if (isVaultChain) {
      deployUtils = await deployVaultChainContracts(deployUtils);
    } else {
      deployUtils = await deployControllerChainContracts(deployUtils);
    }

    for (let sibling of siblings) {
      deployUtils = await deployConnectors(isVaultChain, sibling, deployUtils);
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

  await storeSuperTokenAddresses(
    deployUtils.addresses as SuperTokenChainAddresses,
    deployUtils.currentChainSlug,
    `${getMode()}_${getTokenProject().toLowerCase()}_addresses.json`
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as SuperTokenChainAddresses,
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
    const addr: SuperTokenChainAddresses =
      deployParams.addresses as SuperTokenChainAddresses;

    if (isSuperTokenVaultChain) {
      const a = addr as SuperTokenVaultChainAddresses;

      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
    } else {
      const a = addr as SuperTokenControllerChainAddresses;
      if (!a.Controller) throw new Error("Controller not found!");
      hub = a.Controller;
    }

    integrationTypes = Object.keys(
      tc.limits[deployParams.currentChainSlug]
    ) as IntegrationTypes[];

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
    if (!deployParams.addresses[CommonContracts.NonMintableToken])
      deployParams.addresses[CommonContracts.NonMintableToken] =
        nonMintableToken;

    const vault: Contract = await getOrDeploy(
      CommonContracts.Vault,
      "contracts/hub/Vault.sol",
      [nonMintableToken],
      deployParams
    );
    deployParams.addresses[CommonContracts.Vault] = vault.address;
    // console.log(deployParams.addresses);

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
    deployParams = await deploySuperToken(deployParams);

    const controller: Contract = await getOrDeploy(
      CommonContracts.Controller,
      "contracts/hub/Controller.sol",
      [deployParams.addresses[SuperTokenContracts.SuperToken]],
      deployParams
    );
    deployParams.addresses[CommonContracts.Controller] = controller.address;

    deployParams = await deployHookContracts(true, deployParams);

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
      false,
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
      false, // dont need pool ids in supertoken
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

const deploySuperToken = async (deployParams: DeployParams) => {
  let contractName = SuperTokenContracts.SuperToken;
  let path = `contracts/token/${contractName}.sol`;

  let { name, symbol, decimals, initialSupply, initialSupplyOwner, owner } =
    tc.tokenInfo;

  const superTokenContract: Contract = await getOrDeploy(
    contractName,
    path,
    [name, symbol, decimals, initialSupplyOwner, owner, initialSupply],
    deployParams
  );
  deployParams.addresses[contractName] = superTokenContract.address;
  return deployParams;
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
