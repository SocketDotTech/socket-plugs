import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet, utils } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import {
  integrationTypes,
  isAppChain,
  mode,
  projectConstants,
  tokenDecimals,
  tokenName,
  tokenSymbol,
} from "../helpers/constants";
import {
  DeployParams,
  createObj,
  getProjectAddresses,
  getOrDeploy,
  storeAddresses,
} from "../helpers/utils";
import {
  CONTRACTS,
  ProjectAddresses,
  TokenAddresses,
  AppChainAddresses,
  NonAppChainAddresses,
} from "../helpers/types";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  try {
    let addresses: ProjectAddresses;
    try {
      addresses = await getProjectAddresses();
    } catch (error) {
      addresses = {} as ProjectAddresses;
    }

    await Promise.all(
      [projectConstants.appChain, ...projectConstants.nonAppChains].map(
        async (chain: ChainSlug) => {
          let allDeployed = false;
          const signer = getSignerFromChainSlug(chain);

          let chainAddresses: TokenAddresses = addresses[chain]?.[
            projectConstants.tokenToBridge
          ]
            ? (addresses[chain]?.[
              projectConstants.tokenToBridge
            ] as TokenAddresses)
            : ({} as TokenAddresses);

          const siblings = isAppChain(chain)
            ? projectConstants.nonAppChains
            : [projectConstants.appChain];

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
        }
      )
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
    deployUtils.addresses.isAppChain = isAppChain;
    if (isAppChain) {
      deployUtils = await deployAppChainContracts(deployUtils);
    } else {
      // deployUtils = await deployNonAppChainContracts(deployUtils);
    }

    // for (let sibling of siblings) {
    //   deployUtils = await deployConnectors(sibling, deployUtils);
    // }
    allDeployed = true;
    console.log(deployUtils.addresses);
    console.log("Contracts deployed!");
  } catch (error) {
    console.log(
      `Error in deploying setup contracts for ${deployUtils.currentChainSlug}`,
      error
    );
  }

  await storeAddresses(deployUtils.addresses, deployUtils.currentChainSlug);
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses,
  };
};

const deployConnectors = async (
  sibling: ChainSlug,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses) throw new Error("Addresses not found!");

    const socket: string = getAddresses(
      deployParams.currentChainSlug,
      mode
    ).Socket;
    let hub: string;
    const addr: TokenAddresses = deployParams.addresses;
    if (addr.isAppChain) {
      const a = addr as AppChainAddresses;
      if (!a.Controller) throw new Error("Controller not found!");
      hub = a.Controller;
    } else {
      const a = addr as NonAppChainAddresses;
      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
    }

    for (let intType of integrationTypes) {
      console.log(hub, socket, sibling);
      const connector: Contract = await getOrDeploy(
        CONTRACTS.ConnectorPlug,
        "src/ConnectorPlug.sol",
        [hub, socket, sibling],
        deployParams
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
      CONTRACTS.ExchangeRate,
      "src/ExchangeRate.sol",
      [],
      deployParams
    );
    deployParams.addresses[CONTRACTS.ExchangeRate] = exchangeRate.address;

    if (!deployParams.addresses[CONTRACTS.MintableToken])
      throw new Error("Token not found on app chain");

    const controller: Contract = await getOrDeploy(
      CONTRACTS.Controller,
      "src/Controller.sol",
      [deployParams.addresses[CONTRACTS.MintableToken], exchangeRate.address],
      deployParams
    );
    deployParams.addresses[CONTRACTS.Controller] = controller.address;
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
  try {
    if (!deployParams.addresses[CONTRACTS.NonMintableToken])
      throw new Error("Token not found on chain");

    const vault: Contract = await getOrDeploy(
      CONTRACTS.Vault,
      "src/Vault.sol",
      [deployParams.addresses[CONTRACTS.NonMintableToken]],
      deployParams
    );
    deployParams.addresses[CONTRACTS.Vault] = vault.address;
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
