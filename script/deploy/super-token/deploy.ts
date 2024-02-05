import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { DeployParams, getInstance } from "../../helpers/utils";
import {
  SuperTokenContracts,
  SuperTokenChainAddresses,
  SuperTokenAddresses,
  SuperTokenType,
} from "../../../src";
import { getSignerFromChainSlug, overrides } from "../../helpers/networks";

import {
  getSuperTokenProjectAddresses,
  superTokenDeploymentsPath,
  storeSuperTokenAddresses,
  getOrDeployContract,
} from "./utils";
import { getMode } from "../../constants/config";
import { getTokenConstants } from "../../helpers/constants";
import { TokenConfigs } from "../../constants/types";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: SuperTokenChainAddresses;
}

let fileName: string;

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  try {
    let addresses: SuperTokenAddresses;
    const config = getTokenConstants();

    try {
      addresses = await getSuperTokenProjectAddresses(
        config.projectName.toLowerCase() + "_" + config.type.toLowerCase()
      );
    } catch (error) {
      addresses = {} as SuperTokenAddresses;
    }

    fileName = `${getMode()}_${config.projectName.toLowerCase()}_${config.type.toLowerCase()}`;
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
            getSocketAddress(chainSlug),
            config
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
            getSocketAddress(chainSlug),
            config
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
  socketAddress: string,
  config: TokenConfigs
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
  };

  try {
    deployUtils = await deployPlug(deployUtils, socketAddress, config);
    if (config.type === SuperTokenType.WITH_LIMIT_AND_PAYLOAD_EXECUTION) {
      deployUtils = await deployExecutionHelper(deployUtils, config);
    }

    let superToken;
    if (isSuperTokenChain) {
      deployUtils = await deploySuperToken(deployUtils, config);
      superToken = deployUtils.addresses[SuperTokenContracts.SuperToken];
    } else {
      if (!config.vaultTokens[chainSlug]) throw new Error("Token not found!");

      deployUtils.addresses[SuperTokenContracts.NonSuperToken] =
        config.vaultTokens[chainSlug];

      deployUtils = await deployVault(deployUtils, config);
      superToken = deployUtils.addresses[SuperTokenContracts.SuperTokenVault];
    }

    await setSuperTokenOrVault(superToken, deployUtils);

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
    deployUtils.addresses as SuperTokenChainAddresses,
    deployUtils.currentChainSlug,
    `${fileName}_addresses.json`,
    superTokenDeploymentsPath
  );
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses as SuperTokenChainAddresses,
  };
};

const setSuperTokenOrVault = async (
  superToken: string,
  deployParams: DeployParams
) => {
  try {
    let socketPlug: Contract = await getInstance(
      SuperTokenContracts.SocketPlug,
      deployParams.addresses[SuperTokenContracts.SocketPlug]
    );

    socketPlug = socketPlug.connect(deployParams.signer);
    const contractState = await socketPlug.tokenOrVault__();
    console.log(
      `contract state: ${contractState}, superToken: ${superToken}, ${deployParams.currentChainSlug}`
    );
    if (contractState.toLowerCase() === superToken.toLowerCase()) {
      console.log("Token already set!");
      return;
    }

    let tx = await socketPlug.setSuperTokenOrVault(superToken, {
      ...overrides[deployParams.currentChainSlug],
    });
    console.log(deployParams.currentChainSlug, tx.hash);
    await tx.wait();

    console.log("Initialized Socket plug!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
};

const deployPlug = async (
  deployParams: DeployParams,
  socketAddress: string,
  config: TokenConfigs
): Promise<DeployParams> => {
  try {
    if (deployParams.addresses[SuperTokenContracts.SocketPlug])
      return deployParams;

    const socketPlug: Contract = await getOrDeployContract(
      SuperTokenContracts.SocketPlug,
      "contracts/supertoken/plugs/SocketPlug.sol",
      [socketAddress, config.owner, deployParams.currentChainSlug],
      deployParams,
      fileName
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
  deployParams: DeployParams,
  config: TokenConfigs
): Promise<DeployParams> => {
  try {
    let contractName = SuperTokenContracts.SuperToken;
    const args = [
      config.tokenName,
      config.tokenSymbol,
      config.tokenDecimal,
      config.initialSupplyOwner,
      config.owner,
      config.initialSupply,
      deployParams.addresses[SuperTokenContracts.SocketPlug],
    ];
    if (config.type === SuperTokenType.WITH_LIMIT_AND_PAYLOAD_EXECUTION) {
      contractName = SuperTokenContracts.SuperTokenWithExecutionPayload;
      args.push(deployParams.addresses[SuperTokenContracts.ExecutionHelper]);
    }

    if (deployParams.addresses && deployParams.addresses[contractName])
      return deployParams;

    const superToken: Contract = await getOrDeployContract(
      contractName,
      `contracts/supertoken/${contractName}.sol`,
      args,
      deployParams,
      fileName
    );

    deployParams.addresses[contractName] = superToken.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployVault = async (
  deployParams: DeployParams,
  config: TokenConfigs
): Promise<DeployParams> => {
  console.log("deploying vault.......");

  let contractName = SuperTokenContracts.SuperTokenVault;
  const args = [
    deployParams.addresses[SuperTokenContracts.NonSuperToken],
    config.owner,
    deployParams.addresses[SuperTokenContracts.SocketPlug],
  ];
  if (config.type === SuperTokenType.WITH_LIMIT_AND_PAYLOAD_EXECUTION) {
    contractName = SuperTokenContracts.SuperTokenVaultWithExecutionPayload;
    args.push(deployParams.addresses[SuperTokenContracts.ExecutionHelper]);
  }

  if (deployParams.addresses && deployParams.addresses[contractName])
    return deployParams;

  try {
    if (!deployParams.addresses[SuperTokenContracts.NonSuperToken])
      throw new Error("Token not found on chain");

    const vault: Contract = await getOrDeployContract(
      contractName,
      `contracts/supertoken/${contractName}.sol`,
      args,
      deployParams,
      fileName
    );
    deployParams.addresses[contractName] = vault.address;

    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployExecutionHelper = async (
  deployParams: DeployParams,
  config: TokenConfigs
): Promise<DeployParams> => {
  try {
    if (deployParams.addresses[SuperTokenContracts.ExecutionHelper])
      return deployParams;

    const executionHelper: Contract = await getOrDeployContract(
      SuperTokenContracts.ExecutionHelper,
      "contracts/supertoken/plugins/ExecutionHelper.sol",
      [],
      deployParams,
      fileName
    );

    deployParams.addresses[SuperTokenContracts.ExecutionHelper] =
      executionHelper.address;
    console.log(deployParams.addresses);
    console.log("ExecutionHelper Contract deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const getSocketAddress = (chain: ChainSlug) => {
  return getAddresses(chain, getMode()).Socket;
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
