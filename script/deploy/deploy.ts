import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
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
  isSuperBridge,
  isSuperToken,
  getProjectName,
} from "../constants/config";
import {
  DeployParams,
  createObj,
  getSuperBridgeAddresses,
  getOrDeploy,
  storeAddresses,
  getOrDeployConnector,
  getSuperTokenAddresses,
} from "../helpers/utils";
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
  SuperTokenChainAddresses,
  TokenContracts,
  CommonContracts,
  SuperTokenContracts,
  SuperTokenProjectAddresses,
} from "../../src";
import {
  isAppChain,
  getBridgeProjectTokenConstants,
  getSuperTokenConstants,
} from "../helpers/projectConstants";
import { ProjectTokenConstants, SuperTokenConstants } from "../constants/types";
import { ExistingTokenAddresses } from "../constants/existing-token-addresses";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

let projectType: ProjectType;
let pc: ProjectTokenConstants;
let projectName: string;
/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  console.log("========================================================");
  console.log("MODE", getMode());
  projectType = getProjectType();
  projectName = getProjectName();
  console.log(projectType, projectName);

  console.log(
    `Make sure ${getMode()}_${projectName}_addresses.json and ${getMode()}_${projectName}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${getSocketOwner()}`);
  console.log("========================================================");
  if (projectType == ProjectType.SUPERBRIDGE)
    pc = getBridgeProjectTokenConstants();
  else if (projectType == ProjectType.SUPERTOKEN) {
    pc = getSuperTokenConstants();
    if (pc.vaultChains.length > 1)
      throw new Error("Multiple vault chains not supported for superToken");
  }

  try {
    let addresses: ProjectAddresses | SuperTokenProjectAddresses;
    try {
      addresses = isSuperBridge()
        ? await getSuperBridgeAddresses()
        : await getSuperTokenAddresses();
    } catch (error) {
      addresses = {} as ProjectAddresses | SuperTokenProjectAddresses;
    }
    let allChains: ChainSlug[];
    if (isSuperBridge()) allChains = [...pc.nonAppChains, pc.appChain];
    else if (isSuperToken())
      allChains = [...pc.vaultChains, ...pc.superTokenChains];
    const hook = pc?.hook;
    await Promise.all(
      allChains.map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chain);

        let chainAddresses: TokenAddresses | SuperTokenChainAddresses =
          isSuperBridge()
            ? ((addresses[chain]?.[getToken()] ?? {}) as TokenAddresses)
            : ((addresses[chain] ?? {}) as SuperTokenChainAddresses);

        let siblings: ChainSlug[], isAppchain: boolean;
        if (projectType == ProjectType.SUPERBRIDGE) {
          isAppchain = isAppChain(chain);
          siblings = isAppchain ? pc.nonAppChains : [pc.appChain];
        } else if (projectType == ProjectType.SUPERTOKEN)
          siblings = allChains.filter((c) => c !== chain);

        // console.log({ siblings, hook });
        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            isSuperBridge() ? isAppchain : false,
            pc.vaultChains.includes(chain),
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
  isVaultChain: boolean,
  socketSigner: Wallet,
  chainSlug: number,
  siblings: number[],
  hook: Hooks,
  deployedAddresses: TokenAddresses | SuperTokenChainAddresses
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
    if (isSuperBridge()) {
      addr.isAppChain = isAppChain;
      deployUtils.addresses = addr;

      if (isAppChain) {
        deployUtils = await deployControllerChainContracts(deployUtils);
      } else {
        deployUtils = await deployVaultChainContracts(deployUtils);
      }
    }
    if (isSuperToken()) {
      if (isVaultChain)
        deployUtils = await deployVaultChainContracts(deployUtils);
      else deployUtils = await deployControllerChainContracts(deployUtils);
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
    `${getMode()}_${projectName.toLowerCase()}_addresses.json`
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
    const addr: TokenAddresses | SuperTokenChainAddresses =
      deployParams.addresses as TokenAddresses;

    if (isSuperBridge()) {
      let addresses = deployParams.addresses as TokenAddresses;
      console.log(deployParams.currentChainSlug, { addresses });
      if (addresses.isAppChain) {
        hub = addresses.Controller;
      } else {
        const a = addresses as NonAppChainAddresses;
        hub = a.Vault;
      }
    }
    if (isSuperToken()) {
      if (pc.vaultChains.includes(deployParams.currentChainSlug))
        hub = deployParams.addresses[CommonContracts.Vault];
      else hub = deployParams.addresses[CommonContracts.Controller];
    }

    if (!hub) throw new Error("Hub not found!");

    integrationTypes = Object.keys(
      pc.limits[deployParams.currentChainSlug]
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

const deployControllerChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (isSuperToken()) {
      deployParams = await deploySuperToken(deployParams);
    }

    let mintableToken: string;
    if (isSuperBridge()) {
      let token =
        deployParams.addresses[SuperBridgeContracts.MintableToken] ??
        ExistingTokenAddresses[deployParams.currentChainSlug]?.[getToken()];
      if (token) mintableToken = token;
      else throw new Error("Token not found on app chain");
    }

    if (isSuperToken()) {
      let token = deployParams.addresses[TokenContracts.SuperToken];
      if (token) mintableToken = token;
      else throw new Error("SuperToken not found on chain");
    }

    // if address is picked from existing addresses, then set it in deployParams
    if (
      isSuperBridge() &&
      !deployParams.addresses[SuperBridgeContracts.MintableToken]
    )
      deployParams.addresses[SuperBridgeContracts.MintableToken] =
        mintableToken;

    let controller: Contract;
    if (isSuperBridge()) {
      controller = await getOrDeploy(
        pc.isFiatTokenV2_1
          ? SuperBridgeContracts.FiatTokenV2_1_Controller
          : SuperBridgeContracts.Controller,
        pc.isFiatTokenV2_1
          ? "contracts/hub/FiatTokenV2_1/FiatTokenV2_1_Controller.sol"
          : "contracts/hub/Controller.sol",
        [mintableToken],
        deployParams
      );
    } else if (isSuperToken()) {
      controller = await getOrDeploy(
        CommonContracts.Controller,
        "contracts/hub/Controller.sol",
        [mintableToken],
        deployParams
      );
    }

    deployParams.addresses[SuperBridgeContracts.Controller] =
      controller.address;

    deployParams = await deployHookContracts(true, deployParams);

    // console.log(deployParams.addresses);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log(
      "Error in deploying controller chain contracts: ",
      deployParams.currentChainSlug,
      error
    );
  }
  return deployParams;
};

const deployVaultChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  console.log(
    `Deploying vault chain contracts, chain: ${deployParams.currentChainSlug}...`
  );
  try {
    let nonMintableToken: string =
      deployParams.addresses[SuperBridgeContracts.NonMintableToken] ??
      ExistingTokenAddresses[deployParams.currentChainSlug]?.[getToken()];
    if (!nonMintableToken) throw new Error("Token not found on app chain");

    console.log({ nonMintableToken });
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

    deployParams = await deployHookContracts(false, deployParams);
    console.log(deployParams.currentChainSlug, " Chain Contracts deployed!");
  } catch (error) {
    console.log(
      "Error in deploying vault chain contracts: ",
      deployParams.currentChainSlug,
      error
    );
  }
  return deployParams;
};

const deployHookContracts = async (
  useConnnectorPools: boolean,
  deployParams: DeployParams
) => {
  const hook = deployParams.hook;
  if (!hook) return deployParams;

  let contractName: string;
  let path: string;
  let args: any[] = [];

  let hubAddress: string;

  // no use of connectorPools for superToken
  useConnnectorPools = isSuperToken() ? false : useConnnectorPools;

  if (isSuperBridge()) {
    hubAddress = deployParams.addresses["isAppChain"]
      ? deployParams.addresses[SuperBridgeContracts.Controller]
      : deployParams.addresses[SuperBridgeContracts.Vault];
  } else if (isSuperToken()) {
    hubAddress = pc.vaultChains.includes(deployParams.currentChainSlug)
      ? deployParams.addresses[CommonContracts.Vault]
      : deployParams.addresses[CommonContracts.Controller];
  }

  if (hook == Hooks.LIMIT_HOOK) {
    contractName = HookContracts.LimitHook;
    args = [
      getSocketOwner(),
      hubAddress,
      useConnnectorPools, // useControllerPools
    ];
  } else if (hook == Hooks.LIMIT_EXECUTION_HOOK) {
    contractName = HookContracts.LimitExecutionHook;
    deployParams = await deployExecutionHelper(deployParams);
    args = [
      getSocketOwner(),
      hubAddress,
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

  let tc = pc as SuperTokenConstants;
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
