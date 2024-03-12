import { BigNumber, Contract, ethers, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  CORE_CONTRACTS,
  getAddresses,
} from "@socket.tech/dl-core";

import { getSignerFromChainSlug, overrides } from "../../helpers/networks";
import {
  getInstance,
  getProjectAddresses,
  getPoolIdHex,
} from "../../helpers/utils";
import {
  getProjectTokenConstants,
  getLimitBN,
  getRateBN,
  isAppChain,
} from "../../helpers/constants";
import { getSocket } from "../../bridge/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  ConnectorAddresses,
  Connectors,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
} from "../../../src";
import { getDryRun, getMode, getToken } from "../../constants/config";
import { ProjectTokenConstants } from "../../constants/types";

type UpdateLimitParams = [
  boolean,
  string,
  string | number | BigNumber,
  string | number | BigNumber
];

let pc: ProjectTokenConstants;

async function execute(
  contract: ethers.Contract,
  method: string,
  args: any[],
  chain: number,
  optionalOverrides?: any
) {
  if (getDryRun()) {
    console.log("=".repeat(20));
    console.log(
      `DRY RUN - Calling '${method}' on ${contract.address} on chain ${chain} with args:`
    );
    console.log(args);
    console.log("=".repeat(20));
  } else {
    let tx = await contract.functions[method](...args, {
      ...overrides[chain],
      ...(optionalOverrides || {}),
    });
    console.log(`Sent on chain: ${chain} txHash: ${tx.hash}`);
    await tx.wait();
  }
}

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    pc = getProjectTokenConstants();

    const nonAppChainsList: ChainSlug[] = Object.keys(pc.nonAppChains).map(
      (k) => parseInt(k)
    );
    await Promise.all(
      [pc.appChain, ...nonAppChainsList].map(async (chain) => {
        const addr: TokenAddresses | undefined = addresses[chain]?.[getToken()];
        const connectors: Connectors | undefined = addr?.connectors;
        if (!addr || !connectors) return;

        const socketSigner = getSignerFromChainSlug(chain);

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];
        console.log(`Configuring ${chain} for ${siblingSlugs}`);

        await connect(addr, addresses, chain, siblingSlugs, socketSigner);

        let contract: Contract;
        if (addr.isAppChain) {
          const a = addr as AppChainAddresses;
          if (!a.Controller) {
            console.log("Controller not found");
            return;
          }
          contract = await getInstance(
            SuperBridgeContracts.Controller,
            a.Controller
          );
        } else {
          const a = addr as NonAppChainAddresses;
          if (!a.Vault) {
            console.log("Vault not found");
            return;
          }
          contract = await getInstance(SuperBridgeContracts.Vault, a.Vault);
        }

        contract = contract.connect(socketSigner);

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

            let lockParams;
            if (addr.isAppChain) {
              lockParams = await contract.functions.getMintLimitParams(
                itConnectorAddress
              );
            } else {
              lockParams = await contract.functions.getLockLimitParams(
                itConnectorAddress
              );
            }

            let unlockParams;
            if (addr.isAppChain) {
              unlockParams = await contract.functions.getBurnLimitParams(
                itConnectorAddress
              );
            } else {
              unlockParams = await contract.functions.getUnlockLimitParams(
                itConnectorAddress
              );
            }

            // mint/lock/deposit limits
            const mintLimit = getLimitBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              true
            );
            const mintRate = getRateBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              true
            );

            if (
              !mintLimit.eq(lockParams[0]["maxLimit"]) ||
              !mintRate.eq(lockParams[0]["ratePerSecond"])
            ) {
              updateLimitParams.push([
                true,
                itConnectorAddress,
                mintLimit,
                mintRate,
              ]);
            }

            // burn/unlock/withdraw limits
            const burnLimit = getLimitBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              false
            );
            const burnRate = getRateBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              false
            );

            if (
              !burnLimit.eq(unlockParams[0]["maxLimit"]) ||
              !burnRate.eq(unlockParams[0]["ratePerSecond"])
            ) {
              updateLimitParams.push([
                false,
                itConnectorAddress,
                burnLimit,
                burnRate,
              ]);
            }

            if (chain === pc.appChain) {
              connectorAddresses.push(itConnectorAddress);
              connectorPoolIds.push(getPoolIdHex(sibling, it));
            }
          }
        }

        if (!updateLimitParams.length) return;

        await execute(
          contract,
          "updateLimitParams",
          [updateLimitParams],
          chain
        );
        console.log(`Setting vault limits for ${chain} - COMPLETED`);

        if (
          addr.isAppChain &&
          connectorAddresses.length &&
          connectorPoolIds.length
        ) {
          await execute(
            contract,
            "updateConnectorPoolId",
            [connectorAddresses, connectorPoolIds],
            chain
          );
          console.log(`Setting pool Ids for ${chain} - COMPLETED`);
        }
      })
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

// const switchboardName = (it: IntegrationTypes) =>
//   it === IntegrationTypes.fast
//     ? CORE_CONTRACTS.FastSwitchboard
//     : it === IntegrationTypes.optimistic
//     ? CORE_CONTRACTS.OptimisticSwitchboard
//     : CORE_CONTRACTS.NativeSwitchboard;

const connect = async (
  addr: TokenAddresses,
  addresses: ProjectAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log("connecting plugs for ", chain, siblingSlugs);

    for (let sibling of siblingSlugs) {
      const localConnectorAddresses: ConnectorAddresses | undefined =
        addr.connectors?.[sibling];
      const siblingConnectorAddresses: ConnectorAddresses | undefined =
        addresses?.[sibling]?.[getToken()]?.connectors?.[chain];
      if (!localConnectorAddresses || !siblingConnectorAddresses) continue;

      const integrationTypes: IntegrationTypes[] = Object.keys(
        localConnectorAddresses
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);
      for (let integration of integrationTypes) {
        const siblingConnectorPlug = siblingConnectorAddresses[integration];
        const localConnectorPlug = localConnectorAddresses[integration];
        if (!localConnectorPlug || !siblingConnectorPlug) continue;

        console.log("connecting plugs for ", {
          chain,
          sibling,
          integration,
          localConnectorPlug,
          siblingConnectorPlug,
        })

        console.log(getAddresses(chain, getMode()).integrations[
          sibling
          ])

        const switchboard = getAddresses(chain, getMode()).integrations[
          sibling
        ][integration]?.switchboard;

        if (!switchboard) {
          console.log(
            `switchboard not found for ${chain}, ${sibling}, ${integration}`
          );
        }

        let config = await socketContract.getPlugConfig(
          localConnectorPlug,
          sibling
        );

        if (config[0].toLowerCase() === siblingConnectorPlug.toLowerCase()) {
          console.log("already set, confirming ", { config });
          continue;
        }

        const connectorContract = (
          await getInstance(
            SuperBridgeContracts.ConnectorPlug,
            localConnectorPlug
          )
        ).connect(socketSigner);

        await execute(
          connectorContract,
          "connect",
          [siblingConnectorPlug, switchboard],
          chain
        );
      }
    }
  } catch (error) {
    console.log("error while connecting plugs: ", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
