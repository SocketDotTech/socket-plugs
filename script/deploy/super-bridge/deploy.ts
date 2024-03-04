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
  getProject,
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
} from "../../helpers/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
} from "../../../src";
import { isAppChain, getProjectTokenConstants } from "../../helpers/constants";
import { ProjectTokenConstants } from "../../constants/types";
import { TokenDetails } from "../../constants/token-constants/token-details";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

let pc: ProjectTokenConstants;

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  console.log("========================================================");
  console.log("MODE", getMode());
  console.log("PROJECT", getProject());
  console.log("TOKEN", getToken());
  console.log(
    `Make sure ${getMode()}_${getProject()}_addresses.json and ${getMode()}_${getProject()}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${getSocketOwner()}`);
  console.log("========================================================");
  pc = getProjectTokenConstants();
  try {
    let addresses: ProjectAddresses;
    try {
      addresses = await getProjectAddresses();
    } catch (error) {
      addresses = {} as ProjectAddresses;
    }
    const nonAppChainsList: ChainSlug[] = Object.keys(pc.nonAppChains).map(
      (k) => parseInt(k)
    );
    await Promise.all(
      [pc.appChain, ...nonAppChainsList].map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chain);

        let chainAddresses: TokenAddresses = addresses[chain]?.[getToken()]
          ? (addresses[chain]?.[getToken()] as TokenAddresses)
          : ({} as TokenAddresses);

        const siblings = isAppChain(chain) ? nonAppChainsList : [pc.appChain];

        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            isAppChain(chain),
            signer,
            chain,
            siblings,
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
  deployedAddresses: TokenAddresses
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
  };

  try {
    const addr = deployUtils.addresses as TokenAddresses;
    addr.isAppChain = isAppChain;
    if (isAppChain) {
      deployUtils = await deployAppChainContracts(deployUtils);
    } else {
      deployUtils = await deployNonAppChainContracts(deployUtils);
    }

    for (let sibling of siblings) {
      deployUtils = await deployConnectors(sibling, deployUtils);
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

  await storeAddresses(
    deployUtils.addresses as TokenAddresses,
    deployUtils.currentChainSlug,
    `${getMode()}_${getProject().toLowerCase()}_addresses.json`
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
    if (!deployParams.addresses) throw new Error("Addresses not found!");

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
      integrationTypes = Object.keys(
        pc.nonAppChains[sibling]
      ) as IntegrationTypes[];
    } else {
      const a = addr as NonAppChainAddresses;
      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
      integrationTypes = Object.keys(
        pc.nonAppChains[deployParams.currentChainSlug]
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

const deployAppChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    const exchangeRate: Contract = await getOrDeploy(
      SuperBridgeContracts.ExchangeRate,
      "contracts/superbridge/ExchangeRate.sol",
      [],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.ExchangeRate] =
      exchangeRate.address;

    if (!deployParams.addresses[SuperBridgeContracts.MintableToken])
      throw new Error("Token not found on app chain");

    const controller: Contract = await getOrDeploy(
      pc.isFiatTokenV2_1
        ? SuperBridgeContracts.FiatTokenV2_1_Controller
        : SuperBridgeContracts.Controller,
      pc.isFiatTokenV2_1
        ? "contracts/superbridge/FiatTokenV2_1/FiatTokenV2_1_Controller.sol"
        : "contracts/superbridge/Controller.sol",
      [
        deployParams.addresses[SuperBridgeContracts.MintableToken],
        exchangeRate.address,
      ],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Controller] =
      controller.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
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
      TokenDetails[deployParams.currentChainSlug][getToken()];
    if (!nonMintableToken) throw new Error("Token not found on chain");

    const vault: Contract = await getOrDeploy(
      SuperBridgeContracts.Vault,
      "contracts/superbridge/Vault.sol",
      [nonMintableToken],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Vault] = vault.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
