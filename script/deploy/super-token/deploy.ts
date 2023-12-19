import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { mode } from "../../helpers/constants";
import {
  DeployParams,
  getInstance,
  getOrDeploy,
  storeAddresses,
} from "../../helpers/utils";
import {
  SuperTokenContracts,
  SuperTokenChainAddresses,
  SuperTokenAddresses,
} from "../../../src";
import { getSignerFromChainSlug, overrides } from "../../helpers/networks";

import { config } from "./config";
import {
  getSuperTokenProjectAddresses,
  superTokenDeploymentsPath,
} from "./utils";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: SuperTokenChainAddresses;
}

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  try {
    let addresses: SuperTokenAddresses;
    try {
      addresses = await getSuperTokenProjectAddresses(config.projectName);
    } catch (error) {
      addresses = {} as SuperTokenAddresses;
    }

    const vaultChains = Object.keys(config.vaultTokens);
    await Promise.all(
      [...vaultChains].map(async (chain: string) => {
        const chainSlug = parseInt(chain) as ChainSlug;
        const signer = getSignerFromChainSlug(chainSlug);

        let allDeployed = false;
        let chainAddresses: SuperTokenChainAddresses = addresses[chainSlug]
          ? (addresses[chainSlug] as SuperTokenChainAddresses)
          : ({} as SuperTokenChainAddresses);

        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            false,
            signer,
            chainSlug,
            chainAddresses,
            getSocketAddress(chainSlug)
          );

          allDeployed = results.allDeployed;
          chainAddresses = results.deployedAddresses;
        }
      })
    );

    await Promise.all(
      [...config.superTokenChains].map(async (chainSlug: ChainSlug) => {
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chainSlug);

        let chainAddresses: SuperTokenChainAddresses = addresses[chainSlug]
          ? (addresses[chainSlug] as SuperTokenChainAddresses)
          : ({} as SuperTokenChainAddresses);

        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            true,
            signer,
            chainSlug,
            chainAddresses,
            getSocketAddress(chainSlug)
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
  isSuperTokenChain: boolean,
  socketSigner: Wallet,
  chainSlug: number,
  deployedAddresses: SuperTokenChainAddresses,
  socketAddress: string
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
  };

  try {
    deployUtils = await deployPlug(deployUtils, socketAddress);

    let superToken;
    if (isSuperTokenChain) {
      deployUtils = await deploySuperToken(deployUtils);
      superToken = deployUtils.addresses[SuperTokenContracts.SuperToken];
    } else {
      if (
        !config.vaultTokens[chainSlug] &&
        !config.vaultTokens[chainSlug].token
      )
        throw new Error("Token not found!");
      deployUtils.addresses[SuperTokenContracts.NonSuperToken] =
        config.vaultTokens[chainSlug].token;
      deployUtils = await deployVault(deployUtils);
      superToken = deployUtils.addresses[SuperTokenContracts.SuperTokenVault];
    }

    await setSuperToken(superToken, deployUtils);

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
    deployUtils.addresses,
    deployUtils.currentChainSlug,
    superTokenDeploymentsPath
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as SuperTokenChainAddresses,
  };
};

const setSuperToken = async (
  superToken: string,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    let socketPlug: Contract = await getInstance(
      SuperTokenContracts.SocketPlug,
      deployParams.addresses[SuperTokenContracts.SocketPlug]
    );

    socketPlug = socketPlug.connect(deployParams.signer);
    let tx = await socketPlug.setSuperToken(superToken, {
      ...overrides[deployParams.currentChainSlug],
    });
    console.log(deployParams.currentChainSlug, tx.hash);
    await tx.wait();

    console.log("Initialized Socket plug!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployPlug = async (
  deployParams: DeployParams,
  socketAddress: string
): Promise<DeployParams> => {
  try {
    const socketPlug: Contract = await getOrDeploy(
      SuperTokenContracts.SocketPlug,
      "contracts/supertoken/SocketPlug.sol",
      [socketAddress, config.owner],
      deployParams,
      config.projectName
    );
    deployParams.addresses[SuperTokenContracts.SocketPlug] = socketPlug.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deploySuperToken = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    const superToken: Contract = await getOrDeploy(
      SuperTokenContracts.SuperToken,
      "contracts/supertoken/SuperToken.sol",
      [
        config.tokenName,
        config.tokenSymbol,
        config.tokenDecimal,
        config.initialSupplyOwner,
        config.owner,
        config.initialSupply,
        deployParams.addresses[SuperTokenContracts.SocketPlug],
      ],
      deployParams,
      config.projectName
    );
    deployParams.addresses[SuperTokenContracts.SuperToken] = superToken.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployVault = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses[SuperTokenContracts.NonSuperToken])
      throw new Error("Token not found on chain");

    const vault: Contract = await getOrDeploy(
      SuperTokenContracts.SuperTokenVault,
      "contracts/supertoken/SuperTokenVault.sol",
      [
        deployParams.addresses[SuperTokenContracts.NonSuperToken],
        config.owner,
        deployParams.addresses[SuperTokenContracts.SocketPlug],
      ],
      deployParams,
      config.projectName
    );
    deployParams.addresses[SuperTokenContracts.SuperTokenVault] = vault.address;

    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const getSocketAddress = (chain: ChainSlug) => {
  return getAddresses(chain, mode).Socket;
};
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
