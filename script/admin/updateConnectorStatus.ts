import { Contract } from "ethers";
import { ChainSlug } from "@socket.tech/dl-core";
import { printExecSummary, getProjectAddresses } from "../helpers";
import { getTokenConstants } from "../helpers/projectConstants";
import {
  Connectors,
  ProjectType,
  TokenConstants,
  SBAddresses,
  STAddresses,
  SBTokenAddresses,
  STTokenAddresses,
} from "../../src";
import { getProjectName, getProjectType, getTokens } from "../constants/config";
import { connectorStatus, filterChains, siblingFilterChains } from "./utils";
import { verifyConstants } from "../helpers/verifyConstants";
import { getBridgeContract, updateConnectorStatus } from "../helpers/common";
import { Tokens } from "../../src/enums";

export enum ConnectorStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

let projectType: ProjectType;
let pc: { [token: string]: TokenConstants } = {};
let projectName: string;
let tokens: Tokens[];

export const main = async () => {
  try {
    await verifyConstants();
    projectType = getProjectType();
    projectName = getProjectName();
    tokens = getTokens();

    if (!connectorStatus || !["active", "inactive"].includes(connectorStatus)) {
      throw Error(
        "Connector status not provided, use either active or inactive"
      );
    }

    for (let token of tokens) {
      pc[token] = getTokenConstants(token);
      let addresses: SBAddresses | STAddresses;
      try {
        addresses = getProjectAddresses();
      } catch (error) {
        addresses = {} as SBAddresses | STAddresses;
      }
      let allChains: ChainSlug[] = [
        ...pc[token].controllerChains,
        ...pc[token].vaultChains,
      ];

      if (filterChains) {
        allChains = allChains.filter((c) => filterChains!.includes(c));
      }
      await Promise.all(
        allChains.map(async (chain) => {
          let addr: SBTokenAddresses | STTokenAddresses = (addresses[chain]?.[
            token
          ] ?? {}) as SBTokenAddresses | STTokenAddresses;
          const connectors: Connectors | undefined = addr?.connectors;
          if (!addr || !connectors) return;

          let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
            parseInt(k)
          ) as ChainSlug[];
          if (siblingFilterChains) {
            siblingSlugs = siblingSlugs.filter((c) =>
              siblingFilterChains!.includes(c)
            );
          }
          let bridgeContract: Contract = await getBridgeContract(
            chain,
            token,
            addr
          );
          await updateConnectorStatus(
            chain,
            siblingSlugs,
            connectors,
            bridgeContract,
            connectorStatus === ConnectorStatus.ACTIVE ? true : false
          );
        })
      );
    }

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
