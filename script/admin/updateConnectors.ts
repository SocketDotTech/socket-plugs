import fs from "fs";
import { BigNumber, Contract, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  CORE_CONTRACTS,
  getAddresses,
} from "@socket.tech/dl-core";

import { getProviderFromChainSlug, overrides } from "../helpers/networks";
import { deployedAddressPath, getInstance } from "../helpers/utils";
import {
  projectConstants,
  mode,
} from "../helpers/constants";
import { CONTRACTS, ProjectAddresses, TokenAddresses } from "../helpers/types";
import { getSocket } from "../bridge/utils";

export const main = async () => {
  try {
    if (!fs.existsSync(deployedAddressPath())) {
      throw new Error("addresses.json not found");
    }
    let addresses: ProjectAddresses = JSON.parse(
      fs.readFileSync(deployedAddressPath(), "utf-8")
    );

    await Promise.all(
      [projectConstants.appChain, ...projectConstants.nonAppChains].map(
        async (chain) => {
          if (
            !addresses[chain] ||
            !addresses[chain]?.[projectConstants.tokenToBridge] ||
            !addresses[chain]?.[projectConstants.tokenToBridge]?.connectors
          )
            return;
          let addr: TokenAddresses =
            addresses[chain]?.[projectConstants.tokenToBridge]!;

          const providerInstance = getProviderFromChainSlug(chain);

          const socketSigner: Wallet = new Wallet(
            process.env.SOCKET_SIGNER_KEY as string,
            providerInstance
          );

          let siblingSlugs: ChainSlug[] = Object.keys(
            addr.connectors!
          ) as unknown as ChainSlug[];
          console.log(`Configuring ${chain} for ${siblingSlugs}`);

          await connect(addr, addresses, chain, siblingSlugs, socketSigner);
        }
      )
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const switchboardName = (it: IntegrationTypes) => {
  switch (it) {
    case IntegrationTypes.fast:
      return CORE_CONTRACTS.FastSwitchboard2;  // comment this after migration
    // return CORE_CONTRACTS.FastSwitchboard;
    case IntegrationTypes.optimistic:
      return CORE_CONTRACTS.OptimisticSwitchboard;
    default:
      return CORE_CONTRACTS.NativeSwitchboard;
  }
}


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
      const chainAddr = addr.connectors?.[sibling]!;
      if (
        !addresses[sibling]?.[projectConstants.tokenToBridge]?.connectors?.[
        chain
        ]
      )
        continue;

      const siblingAddr =
        addresses[sibling]?.[projectConstants.tokenToBridge]?.connectors?.[
        chain
        ];
      const integrationTypes: IntegrationTypes[] = Object.keys(
        chainAddr
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);
      for (let integration of integrationTypes) {
        const siblingConnectorPlug = siblingAddr?.[integration]!;
        const switchboard = getAddresses(chain, mode)?.[
          switchboardName(integration)
        ];

        if (
          !addresses[sibling]?.[projectConstants.tokenToBridge]?.connectors?.[
          chain
          ]
        )
          continue;

        let config = await socketContract.getPlugConfig(
          chainAddr[integration],
          sibling
        );

        if (
          config[0].toLowerCase() === siblingConnectorPlug.toLowerCase() &&
          config[1].toLowerCase() === switchboard.toLowerCase()
        ) {
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
