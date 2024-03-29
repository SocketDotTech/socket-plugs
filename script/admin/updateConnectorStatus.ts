import { Contract } from "ethers";

import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";

import {
  getSuperBridgeAddresses,
  getSuperTokenAddresses,
  execute,
  getBridgeContract,
  printExecSummary,
} from "../helpers";
import {
  getBridgeProjectTokenConstants,
  getSuperTokenConstants,
} from "../helpers/projectConstants";
import {
  ConnectorAddresses,
  Connectors,
  ProjectAddresses,
  TokenAddresses,
  SuperTokenChainAddresses,
  SuperTokenProjectAddresses,
} from "../../src";
import { getToken, isSuperBridge, isSuperToken } from "../constants/config";
import { ProjectTokenConstants } from "../constants/types";
import { connectorStatus, filterChains, siblingFilterChains } from "./utils";
import { updateConnectorStatus } from "../deploy/configure";

export enum ConnectorStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

let pc: ProjectTokenConstants;

export const main = async () => {
  console.log("ehre");
  try {
    let addresses: ProjectAddresses | SuperTokenProjectAddresses;
    if (isSuperBridge()) {
      console.log("reached here");
      addresses = (await getSuperBridgeAddresses()) as ProjectAddresses;
      pc = getBridgeProjectTokenConstants();
    } else if (isSuperToken()) {
      console.log("reached here token");
      pc = getSuperTokenConstants();
    console.log("reached here", pc);
      addresses =
        (await getSuperTokenAddresses()) as SuperTokenProjectAddresses;
    console.log("reached here", addresses);

      

    console.log("reached here");

    }
    console.log("reached here");
    if (!connectorStatus || !["active", "inactive"].includes(connectorStatus)) {
      throw Error(
        "Connector status not provided, use either active or inactive"
      );
    }
    let allChains = isSuperBridge()
      ? [pc.appChain, ...pc.nonAppChains]
      : [...pc.vaultChains, ...pc.superTokenChains];

    if (filterChains) {
      allChains = allChains.filter((c) => filterChains.includes(c));
    }
    await Promise.all(
      allChains.map(async (chain) => {
        let addr: TokenAddresses | SuperTokenChainAddresses | undefined;
        if (isSuperBridge())
          addr = addresses[chain]?.[getToken()] as TokenAddresses;
        else addr = addresses[chain] as SuperTokenChainAddresses;

        const connectors: Connectors | undefined = addr?.connectors;
        if (!addr || !connectors) return;

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];
        if (siblingFilterChains) {
          siblingSlugs = siblingSlugs.filter((c) =>
            siblingFilterChains.includes(c)
          );
        }
        let bridgeContract: Contract = await getBridgeContract(chain, addr);
        await updateConnectorStatus(
          chain,
          siblingSlugs,
          connectors,
          bridgeContract,
          connectorStatus === ConnectorStatus.ACTIVE ? true : false
        );
      })
    );

    printExecSummary();
  } catch (error) {
    console.error("Error while sending transaction", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
