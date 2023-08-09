import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { getProviderFromChainName } from "../helpers/networks";
import {
  ChainSlug,
  ChainSlugToKey,
  DeploymentMode,
  getAddresses,
} from "@socket.tech/dl-core";
import {
  chains,
  integrationTypes,
  isAppChain,
  mode,
  tokenDecimals,
  tokenName,
  tokenSymbol,
  tokenToBridge,
  totalSupply,
} from "../helpers/constants";
import {
  DeployParams,
  createObj,
  getAllAddresses,
  getOrDeploy,
  storeAddresses,
} from "../helpers/utils";
import {
  CONTRACTS,
  DeploymentAddresses,
  Common,
  AppChainAddresses,
  NonAppChainAddresses,
} from "../helpers/types";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: Common;
}

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  try {
    let addresses: DeploymentAddresses;
    try {
      addresses = getAllAddresses(mode);
    } catch (error) {
      addresses = {} as DeploymentAddresses;
    }

    await Promise.all(
      chains.map(async (chain: ChainSlug) => {
        let allDeployed = false;
        const network = ChainSlugToKey[chain];

        const providerInstance = await getProviderFromChainName(network);

        const signer: Wallet = new Wallet(
          process.env.SOCKET_SIGNER_KEY as string,
          providerInstance
        );

        let chainAddresses: Common = addresses[chain]?.[tokenToBridge]
          ? (addresses[chain]?.[tokenToBridge] as Common)
          : ({} as Common);

        const siblings = isAppChain(chain)
          ? chains.filter((c) => c !== chain && !isAppChain(c))
          : chains.filter((c) => c !== chain && isAppChain(c));

        while (!allDeployed) {
          const results: ReturnObj = await deploy(
            isAppChain(chain),
            signer,
            chain,
            mode,
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
  currentMode: DeploymentMode,
  siblings: number[],
  deployedAddresses: Common
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    mode: currentMode,
    signer: socketSigner,
    currentChainSlug: chainSlug,
  };

  try {
    deployUtils.addresses["isAppChain"] = isAppChain;
    deployUtils = await deployChainContracts(isAppChain, deployUtils);
    for (let sibling of siblings) {
      deployUtils = await deployConnectors(isAppChain, sibling, deployUtils);
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
    deployUtils.mode
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses,
  };
};

const deployConnectors = async (
  isAppChain: boolean,
  sibling: ChainSlug,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses) throw new Error("Addresses not found!");

    const socket: string = getAddresses(
      deployParams.currentChainSlug,
      deployParams.mode
    ).Socket;
    let hub: string;
    if (isAppChain) {
      const addr: AppChainAddresses = deployParams.addresses;
      if (!addr.Controller) throw new Error("Controller not found!");
      hub = addr.Controller;
    } else {
      const addr: NonAppChainAddresses = deployParams.addresses;
      if (!deployParams.addresses) throw new Error("Addresses not found!");
      if (!addr.Vault) throw new Error("Vault not found!");
      hub = addr.Vault;
    }

    for (let intType of integrationTypes) {
      console.log(hub, socket, sibling);
      const connector: Contract = await getOrDeploy(
        CONTRACTS.ConnectorPlug,
        "src/universalTokens/appChainToken/ConnectorPlug.sol",
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

const deployChainContracts = async (
  isAppChain: boolean,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (isAppChain) {
      const mintableToken: Contract = await getOrDeploy(
        CONTRACTS.MintableToken,
        "src/MintableToken.sol",
        [
          tokenName[tokenToBridge],
          tokenSymbol[tokenToBridge],
          tokenDecimals[tokenToBridge],
        ],
        deployParams
      );
      deployParams.addresses[CONTRACTS.MintableToken] = mintableToken.address;

      const exchangeRate: Contract = await getOrDeploy(
        CONTRACTS.ExchangeRate,
        "src/ExchangeRate.sol",
        [],
        deployParams
      );
      deployParams.addresses[CONTRACTS.ExchangeRate] = exchangeRate.address;

      const controller: Contract = await getOrDeploy(
        CONTRACTS.Controller,
        "src/Controller.sol",
        [mintableToken.address, exchangeRate.address],
        deployParams
      );
      deployParams.addresses[CONTRACTS.Controller] = controller.address;
    } else {
      const nonMintableToken: Contract = await getOrDeploy(
        CONTRACTS.NonMintableToken,
        "src/NonMintableToken.sol",
        [
          tokenName[tokenToBridge],
          tokenSymbol[tokenToBridge],
          tokenDecimals[tokenToBridge],
          totalSupply,
        ],
        deployParams
      );
      deployParams.addresses[CONTRACTS.NonMintableToken] =
        nonMintableToken.address;
      console.log(deployParams.addresses);

      const vault: Contract = await getOrDeploy(
        CONTRACTS.Vault,
        "src/Vault.sol",
        [nonMintableToken.address],
        deployParams
      );
      deployParams.addresses[CONTRACTS.Vault] = vault.address;
    }
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
