import fs from "fs";
import { Contract, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  CORE_CONTRACTS,
  getAddresses,
} from "@socket.tech/dl-core";

import { getProviderFromChainSlug, overrides } from "../helpers/networks";
import { deployedAddressPath, getInstance } from "../helpers/utils";
import {
  FAST_MAX_LIMIT,
  FAST_RATE,
  SLOW_MAX_LIMIT,
  SLOW_RATE,
  chains,
  mode,
} from "../helpers/constants";
import { CONTRACTS, Common, DeploymentAddresses } from "../helpers/types";
import { getSocket } from "../bridge/utils";

type UpdateLimitParams = [boolean, string, string | number, string | number];

export const main = async () => {
  try {
    if (!fs.existsSync(deployedAddressPath(mode))) {
      throw new Error("addresses.json not found");
    }
    let addresses: DeploymentAddresses = JSON.parse(
      fs.readFileSync(deployedAddressPath(mode), "utf-8")
    );

    await Promise.all(
      chains.map(async (chain) => {
        if (!addresses[chain] || !addresses[chain]?.connectors) return;
        let addr: Common = addresses[chain]!;

        const providerInstance = getProviderFromChainSlug(chain);

        const socketSigner: Wallet = new Wallet(
          process.env.PRIVATE_KEY as string,
          providerInstance
        );

        let siblingSlugs: ChainSlug[] = Object.keys(
          addr.connectors!
        ) as unknown as ChainSlug[];
        console.log(`Configuring ${chain} for ${siblingSlugs}`);

        await connect(addr, addresses, chain, siblingSlugs, socketSigner);

        const updateLimitParams: UpdateLimitParams[] = [];
        for (let sibling of siblingSlugs) {
          const integrationTypes: IntegrationTypes[] = Object.keys(
            addr.connectors?.[sibling]!
          ) as unknown as IntegrationTypes[];
          integrationTypes.map((it) => {
            if (!addr.connectors?.[sibling]?.[it]) return;
            const limit =
              it === IntegrationTypes.fast ? FAST_MAX_LIMIT : SLOW_MAX_LIMIT;
            const rate = it === IntegrationTypes.fast ? FAST_RATE : SLOW_RATE;

            updateLimitParams.push([
              true,
              addr.connectors?.[sibling]?.[it]!,
              limit,
              rate,
            ]);

            updateLimitParams.push([
              false,
              addr.connectors?.[sibling]?.[it]!,
              limit,
              rate,
            ]);
          });
        }

        if (!updateLimitParams.length) return;

        let contract: Contract;
        if (addr.isAppChain) {
          contract = await getInstance(CONTRACTS.Controller, addr.Controller!);
        } else {
          contract = await getInstance(CONTRACTS.Vault, addr.Vault!);
        }

        contract = contract.connect(socketSigner);
        let tx = await contract.updateLimitParams(updateLimitParams, {
          ...overrides[chain],
        });
        console.log(chain, tx.hash);
        await tx.wait();

        console.log(`Setting vault limits for ${chain} - COMPLETED`);
      })
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const switchboardName = (it: IntegrationTypes) =>
  it === IntegrationTypes.fast
    ? CORE_CONTRACTS.FastSwitchboard
    : it === IntegrationTypes.optimistic
      ? CORE_CONTRACTS.OptimisticSwitchboard
      : CORE_CONTRACTS.NativeSwitchboard;
const connect = async (
  addr: Common,
  addresses: DeploymentAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log("connecting plugs for ", chain, siblingSlugs);

    for (let sibling of siblingSlugs) {
      const chainAddr = addr.connectors?.[sibling]!;
      if (!addresses[sibling]?.connectors?.[chain]) continue;

      const siblingAddr = addresses[sibling]?.connectors?.[chain];
      const integrationTypes: IntegrationTypes[] = Object.keys(
        chainAddr
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);
      for (let integration of integrationTypes) {
        const siblingConnectorPlug = siblingAddr?.[integration]!;
        const switchboard = getAddresses(chain, mode)?.[
          switchboardName(integration)
        ];

        if (!addresses[sibling]?.connectors?.[chain]) continue;

        let config = await socketContract.getPlugConfig(
          chainAddr[integration],
          sibling
        );

        if (config[0].toLowerCase() === siblingConnectorPlug.toLowerCase()) {
          console.log("already set, confirming ", { config });
          continue;
        }

        const connectorContract = (
          await getInstance(CONTRACTS.ConnectorPlug, chainAddr[integration]!)
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
