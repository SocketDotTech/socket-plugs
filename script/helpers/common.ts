import { BigNumber, Contract } from "ethers";

import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { getSignerFromChainSlug } from "./networks";
import { getInstance } from "./deployUtils";
import {
  AppChainAddresses,
  ConnectorAddresses,
  Connectors,
  HookContracts,
  NonAppChainAddresses,
  ProjectType,
  SBTokenAddresses,
  STControllerChainAddresses,
  STTokenAddresses,
  STVaultChainAddresses,
  SuperBridgeContracts,
  UpdateLimitParams,
} from "../../src";
import { execute, getPoolIdHex } from "./utils";
import {
  getProjectType,
  isSuperBridge,
  isSuperToken,
  getDryRun,
} from "../constants/config";
import {
  getLimitBN,
  getRateBN,
  getTokenConstants,
  isSBAppChain,
  isSTVaultChain,
} from "./projectConstants";
import { Tokens } from "../../src/enums";

export const updateConnectorStatus = async (
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  connectors: Connectors,
  bridgeContract: Contract,
  newConnectorStatus: boolean
) => {
  const connectorAddresses: string[] = [];

  for (let sibling of siblingSlugs) {
    const siblingConnectorAddresses: ConnectorAddresses | undefined =
      connectors[sibling];
    if (!siblingConnectorAddresses) continue;

    const integrationTypes: IntegrationTypes[] = Object.keys(
      siblingConnectorAddresses
    ) as unknown as IntegrationTypes[];
    for (let it of integrationTypes) {
      const itConnectorAddress: string | undefined =
        siblingConnectorAddresses[it];
      if (!itConnectorAddress) continue;

      let currentConnectorStatus = getDryRun()
        ? false
        : await bridgeContract.callStatic.validConnectors(itConnectorAddress);
      if (currentConnectorStatus !== newConnectorStatus) {
        connectorAddresses.push(itConnectorAddress);
      }
    }
  }
  if (connectorAddresses.length) {
    await execute(
      bridgeContract,
      "updateConnectorStatus",
      [
        connectorAddresses,
        new Array(connectorAddresses.length).fill(newConnectorStatus),
      ],
      chain
    );
    console.log(`✔   Connector status set for chain ${chain}`);
  } else {
    console.log(`✔   Connector status already set for chain ${chain}`);
  }
};

export const getBridgeContract = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses
) => {
  const socketSigner = getSignerFromChainSlug(chain);
  let bridgeContract: Contract,
    bridgeAddress: string = "",
    bridgeContractName: string = "";
  if (isSuperBridge()) {
    if (isSBAppChain(chain, token)) {
      const a = addr as AppChainAddresses;
      bridgeAddress = a.Controller;
      bridgeContractName = SuperBridgeContracts.Controller;
    } else {
      const a = addr as NonAppChainAddresses;
      bridgeAddress = a.Vault;
      bridgeContractName = SuperBridgeContracts.Vault;
    }
  }
  if (isSuperToken()) {
    if (isSTVaultChain(chain, token)) {
      const a = addr as STVaultChainAddresses;
      bridgeAddress = a.Vault;
      bridgeContractName = SuperBridgeContracts.Vault;
    } else {
      const a = addr as STControllerChainAddresses;
      bridgeAddress = a.Controller;
      bridgeContractName = SuperBridgeContracts.Controller;
    }
  }

  if (!bridgeAddress) {
    throw new Error("Bridge address not found");
  }

  bridgeContract = await getInstance(bridgeContractName, bridgeAddress);

  bridgeContract = bridgeContract.connect(socketSigner);
  return bridgeContract;
};

export const getTokenContract = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses
) => {
  const socketSigner = getSignerFromChainSlug(chain);
  let tokenContract: Contract,
    tokenAddress: string = "",
    tokenContractName: string = "ERC20";
  if (isSuperBridge()) {
    if (isSBAppChain(chain, token)) {
      const a = addr as AppChainAddresses;
      tokenAddress = a.MintableToken;
    } else {
      const a = addr as NonAppChainAddresses;
      tokenAddress = a.NonMintableToken;
    }
  }
  if (isSuperToken()) {
    if (isSTVaultChain(chain, token)) {
      const a = addr as STVaultChainAddresses;
      tokenAddress = a.NonMintableToken;
    } else {
      const a = addr as STControllerChainAddresses;
      tokenAddress = a.SuperToken;
    }
  }

  if (!tokenAddress) {
    throw new Error("Token address not found");
  }

  tokenContract = await getInstance(tokenContractName, tokenAddress);

  tokenContract = tokenContract.connect(socketSigner);
  return tokenContract;
};

export const getHookContract = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses
) => {
  const socketSigner = getSignerFromChainSlug(chain);

  let contract: Contract | undefined,
    address: string = "",
    contractName: string = "";

  if (addr[HookContracts.LimitHook]) {
    address = addr[HookContracts.LimitHook];
    contractName = HookContracts.LimitHook;
  }
  if (addr[HookContracts.LimitExecutionHook]) {
    address = addr[HookContracts.LimitExecutionHook];
    contractName = HookContracts.LimitExecutionHook;
  }

  if (!address || !contractName) {
    return { hookContract: contract, hookContractName: contractName };
  }

  contract = await getInstance(contractName, address);

  contract = contract.connect(socketSigner);
  return { hookContract: contract, hookContractName: contractName };
};

export const getSiblings = (
  chain: ChainSlug,
  token: Tokens,
  allChains: ChainSlug[]
): ChainSlug[] => {
  let siblings: ChainSlug[] = [];
  let pc = getTokenConstants(token);
  if (getProjectType() == ProjectType.SUPERBRIDGE) {
    siblings = isSBAppChain(chain, token)
      ? pc[token].vaultChains
      : [pc[token].controllerChains[0]];
  } else if (getProjectType() == ProjectType.SUPERTOKEN)
    siblings = allChains.filter((c) => c !== chain);

  return siblings;
};

export const checkAndGrantRole = async (
  chain: ChainSlug,
  contract: Contract,
  roleName: string = "",
  roleHash: string = "",
  userAddress: string
) => {
  let hasRole: boolean | undefined;

  // Do checks first
  try {
    // Check first if the contract has the function `hasRole`
    hasRole = await contract.hasRole(roleHash, userAddress);

    // Get owner and signer
    const owner = await contract.owner();
    const signer = getSignerFromChainSlug(chain);

    // Check if the signer is the owner
    if (owner !== signer.address) {
      console.log(
        `✔   Signer is not the owner of the contract, ask the owner to grant the role`
      );
      return; // Exit the function if the signer is not the owner
    }
  } catch (error) {
    console.log(
      "✔   Contract does not have the function `hasRole`, using custom contract, check with owner"
    );
    return; // Exit the function if the contract does not have the function `hasRole`
  }

  // Grant the role if the user does not have it
  try {
    if (!hasRole) {
      console.log(
        `Adding ${roleName} role to signer`,
        userAddress,
        " for contract: ",
        contract.address,
        " on chain : ",
        chain
      );
      await execute(contract, "grantRole", [roleHash, userAddress], chain);
    } else {
      console.log(
        `✔ ${roleName} role already set on ${contract.address} for ${userAddress} on chain `,
        chain
      );
    }
  } catch (error) {
    console.log(
      "✗   Error, while granting role. You might be using an already Deployed contract, please ask the owner to grant the role."
    );
  }
};

export const updateLimitsAndPoolId = async (
  chain: ChainSlug,
  token: Tokens,
  siblingSlugs: ChainSlug[],
  addr: SBTokenAddresses | STTokenAddresses,
  connectors: Connectors,
  hookContract: Contract
) => {
  const updateLimitParams: UpdateLimitParams[] = [];
  const connectorAddresses: string[] = [];
  const connectorPoolIds: string[] = [];

  for (let sibling of siblingSlugs) {
    const siblingConnectorAddresses: ConnectorAddresses | undefined =
      connectors[sibling];
    if (!siblingConnectorAddresses) continue;

    const integrationTypes: IntegrationTypes[] = Object.keys(
      siblingConnectorAddresses
    ) as unknown as IntegrationTypes[];
    for (let it of integrationTypes) {
      const itConnectorAddress: string | undefined =
        siblingConnectorAddresses[it];
      if (!itConnectorAddress) continue;
      // console.log({ itConnectorAddress });
      let sendingParams = getDryRun()
        ? {}
        : await hookContract.getSendingLimitParams(itConnectorAddress);

      // console.log({ sendingParams });
      let receivingParams = getDryRun()
        ? {}
        : await hookContract.getReceivingLimitParams(itConnectorAddress);

      // mint/lock/deposit limits
      const sendingLimit = getLimitBN(it, chain, token, true);
      const sendingRate = getRateBN(it, chain, token, true);
      if (
        getDryRun() ||
        !sendingLimit.eq(sendingParams["maxLimit"]) ||
        !sendingRate.eq(sendingParams["ratePerSecond"])
      ) {
        updateLimitParams.push([
          true,
          itConnectorAddress,
          sendingLimit,
          sendingRate,
        ]);
      } else {
        console.log(
          `✔   Sending limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
        );
      }

      const receivingLimit = getLimitBN(it, chain, token, false);
      const receivingRate = getRateBN(it, chain, token, false);

      if (
        getDryRun() ||
        !receivingLimit.eq(receivingParams["maxLimit"]) ||
        !receivingRate.eq(receivingParams["ratePerSecond"])
      ) {
        updateLimitParams.push([
          false,
          itConnectorAddress,
          receivingLimit,
          receivingRate,
        ]);
      } else {
        console.log(
          `✔   Receiving limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
        );
      }

      if (
        isSuperBridge() &&
        isSBAppChain(chain, token)
        // chain !== ChainSlug.AEVO &&
        // chain !== ChainSlug.AEVO_TESTNET
      ) {
        const poolId: BigNumber = getDryRun()
          ? BigNumber.from(0)
          : await hookContract.connectorPoolIds(itConnectorAddress);
        // console.log({ itConnectorAddress, poolId });
        const poolIdHex =
          "0x" + BigInt(poolId.toString()).toString(16).padStart(64, "0");

        if (poolIdHex !== getPoolIdHex(sibling, token, it)) {
          connectorAddresses.push(itConnectorAddress);
          connectorPoolIds.push(getPoolIdHex(sibling, token, it));
        } else {
          console.log(
            `✔   Pool id already set for chain ${chain}, sibling ${sibling}, integration ${it}`
          );
        }
      }
    }
  }

  if (updateLimitParams.length) {
    await execute(
      hookContract,
      "updateLimitParams",
      [updateLimitParams],
      chain
    );
  }
  if (isSuperToken()) return;
  let addresses = addr as SBTokenAddresses;
  if (
    addresses.isAppChain &&
    connectorAddresses.length &&
    connectorPoolIds.length
  ) {
    await execute(
      hookContract,
      "updateConnectorPoolId",
      [connectorAddresses, connectorPoolIds],
      chain
    );
  }
};
