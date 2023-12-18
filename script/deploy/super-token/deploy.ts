import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { mode } from "../../helpers/constants";
import { DeployParams, getOrDeploy, storeAddresses } from "../../helpers/utils";
import {
  SuperTokenContracts,
  SuperTokenChainAddresses,
  SuperTokenAddresses,
} from "../../../src";
import { getSignerFromChainSlug } from "../../helpers/networks";

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
        let allDeployed = false;
        const signer = getSignerFromChainSlug(chainSlug);

        let chainAddresses: SuperTokenChainAddresses = addresses[chainSlug]?.[
          config.tokenSymbol
        ]
          ? (addresses[chainSlug]?.[
              config.tokenSymbol
            ] as SuperTokenChainAddresses)
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
    if (isSuperTokenChain) {
      deployUtils = await deploySuperToken(deployUtils);
    } else {
      if (
        !config.vaultTokens[chainSlug] &&
        !config.vaultTokens[chainSlug].token
      )
        throw new Error("Token not found!");
      deployUtils.addresses[SuperTokenContracts.NonSuperToken] =
        config.vaultTokens[chainSlug].token;
      deployUtils = await deployVault(deployUtils);
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
    deployUtils.addresses,
    deployUtils.currentChainSlug,
    superTokenDeploymentsPath
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as SuperTokenChainAddresses,
  };
};

const deployPlug = async (
  deployParams: DeployParams,
  socketAddress: string
): Promise<DeployParams> => {
  try {
    const socketPlug: Contract = await getOrDeploy(
      SuperTokenContracts.SocketPlug,
      "contracts/supertoken/SocketPlug.sol",
      [socketAddress],
      deployParams
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
        config.initialSupply,
        deployParams.addresses[SuperTokenContracts.SocketPlug],
      ],
      deployParams
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
      SuperTokenContracts.Vault,
      "contracts/supertoken/Vault.sol",
      [
        deployParams.addresses[SuperTokenContracts.NonSuperToken],
        deployParams.addresses[SuperTokenContracts.SocketPlug],
        config.owner,
      ],
      deployParams
    );
    deployParams.addresses[SuperTokenContracts.Vault] = vault.address;

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
