import { BigNumber, Contract, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  CORE_CONTRACTS,
  getAddresses,
} from "@socket.tech/dl-core";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getInstance, getProjectAddresses, getPoolIdHex } from "../helpers/utils";
import {
  projectConstants,
  mode,
  getLimitBN,
  getRateBN
} from "../helpers/constants";
import {
  CONTRACTS,
  TokenAddresses,
  ProjectAddresses,
  NonAppChainAddresses,
  AppChainAddresses,
  Connectors,
  ConnectorAddresses,
} from "../helpers/types";
import { getSocket } from "../bridge/utils";

type UpdateLimitParams = [
  boolean,
  string,
  string | number | BigNumber,
  string | number | BigNumber
];

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();

    await Promise.all(
      [projectConstants.appChain, ...projectConstants.nonAppChains].map(
        async (chain) => {
          const addr: TokenAddresses | undefined =
            addresses[chain]?.[projectConstants.tokenToBridge];
          const connectors: Connectors | undefined = addr?.connectors;
          if (!addr || !connectors) return;

          const socketSigner = getSignerFromChainSlug(chain);

          let siblingSlugs: ChainSlug[] = Object.keys(
            connectors
          ) as unknown as ChainSlug[];
          console.log(`Configuring ${chain} for ${siblingSlugs}`);

          await connect(addr, addresses, chain, siblingSlugs, socketSigner);

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

              // mint/lock/deposit limits
              updateLimitParams.push([
                true,
                itConnectorAddress,
                getLimitBN(it, true),
                getRateBN(it, true),
              ]);

              // burn/unlock/withdraw limits
              updateLimitParams.push([
                false,
                itConnectorAddress,
                getLimitBN(it, false),
                getRateBN(it, false),
              ]);

              if (chain === projectConstants.appChain) {
                connectorAddresses.push(itConnectorAddress);
                connectorPoolIds.push(getPoolIdHex(sibling, it));
              }
            }
          }

          if (!updateLimitParams.length) return;

          let contract: Contract;
          if (addr.isAppChain) {
            const a = addr as AppChainAddresses;
            if (!a.Controller) {
              console.log("Controller not found");
              return;
            }
            contract = await getInstance(CONTRACTS.Controller, a.Controller);
          } else {
            const a = addr as NonAppChainAddresses;
            if (!a.Vault) {
              console.log("Vault not found");
              return;
            }
            contract = await getInstance(CONTRACTS.Vault, a.Vault);
          }

          contract = contract.connect(socketSigner);
          let tx = await contract.updateLimitParams(updateLimitParams, {
            ...overrides[chain],
          });
          console.log(chain, tx.hash);
          await tx.wait();

          console.log(`Setting vault limits for ${chain} - COMPLETED`);

          if (addr.isAppChain && connectorAddresses.length && connectorPoolIds.length) {
            let tx = await contract.updateConnectorPoolId(connectorAddresses, connectorPoolIds, {
              ...overrides[chain],
            });
            console.log(chain, tx.hash);
            await tx.wait();

            console.log(`Setting pool Ids for ${chain} - COMPLETED`);
          }


        }
      )
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const switchboardName = (it: IntegrationTypes) =>
  it === IntegrationTypes.fast
    ? CORE_CONTRACTS.FastSwitchboard2
    : it === IntegrationTypes.optimistic
      ? CORE_CONTRACTS.OptimisticSwitchboard
      : CORE_CONTRACTS.NativeSwitchboard;

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
        addresses?.[sibling]?.[projectConstants.tokenToBridge]?.connectors?.[
        chain
        ];
      if (!localConnectorAddresses || !siblingConnectorAddresses) continue;

      const integrationTypes: IntegrationTypes[] = Object.keys(
        localConnectorAddresses
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);
      for (let integration of integrationTypes) {
        const siblingConnectorPlug = siblingConnectorAddresses[integration];
        const localConnectorPlug = localConnectorAddresses[integration];
        if (!localConnectorPlug || !siblingConnectorPlug) continue;

        const switchboard = getAddresses(chain, mode).integrations[sibling][integration]?.switchboard;

        if (!switchboard) {
          console.log(`switchboard not found for ${chain}, ${sibling}, ${integration}`);
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
          await getInstance(CONTRACTS.ConnectorPlug, localConnectorPlug)
        ).connect(socketSigner);

        let tx = await connectorContract.functions["connect"](
          siblingConnectorPlug,
          switchboard,
          { ...overrides[chain] }
        );
        console.log(chain, tx.hash);
        await tx.wait();
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
