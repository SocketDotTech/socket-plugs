import { BigNumber, Contract, Wallet } from "ethers";

import { ChainSlug } from "@socket.tech/dl-core";

import { getSignerFromChainSlug } from "../helpers/networks";
import {
  getInstance,
  getSuperBridgeAddresses,
  getSuperTokenAddresses,
  printExecSummary,
  getBridgeContract,
} from "../helpers";
import {
  getBridgeProjectTokenConstants,
  getSuperTokenConstants,
} from "../helpers/projectConstants";
import {
  Connectors,
  ProjectAddresses,
  TokenAddresses,
  HookContracts,
  SuperTokenChainAddresses,
  SuperTokenProjectAddresses,
} from "../../src";
import {
  getProjectType,
  getToken,
  isSuperBridge,
  isSuperToken,
} from "../constants/config";
import { ProjectTokenConstants } from "../constants/types";
import { filterChains, siblingFilterChains } from "./utils";
import { updateLimitsAndPoolId } from "../deploy/configure";

let pc: ProjectTokenConstants;

let socketSignerAddress: string;

export const main = async () => {
  try {
    let projectType = getProjectType();
    let addresses: ProjectAddresses | SuperTokenProjectAddresses;
    if (isSuperBridge()) {
      addresses = (await getSuperBridgeAddresses()) as ProjectAddresses;
      pc = getBridgeProjectTokenConstants();
    } else if (isSuperToken()) {
      addresses =
        (await getSuperTokenAddresses()) as SuperTokenProjectAddresses;
      pc = getSuperTokenConstants();
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

        const socketSigner = getSignerFromChainSlug(chain);
        socketSignerAddress = await socketSigner.getAddress();

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];
        if (siblingFilterChains) {
          siblingSlugs = siblingSlugs.filter((c) =>
            siblingFilterChains.includes(c)
          );
        }
        let hookContract: Contract;

        if (addr[HookContracts.LimitHook]) {
          hookContract = await getInstance(
            HookContracts.LimitHook,
            addr[HookContracts.LimitHook]
          );
        }
        if (addr[HookContracts.LimitExecutionHook]) {
          hookContract = await getInstance(
            HookContracts.LimitExecutionHook,
            addr[HookContracts.LimitExecutionHook]
          );
        }

        if (!hookContract) {
          console.log("Valid Hook not found for chain: ", chain);
          return;
        }

        // console.log("Hook contract: ", hookContract.address);
        hookContract = hookContract.connect(socketSigner);

        await updateLimitsAndPoolId(
          chain,
          siblingSlugs,
          addr,
          connectors,
          hookContract
        );
      })
    );

    printExecSummary();
  } catch (error) {
    console.error("Error while sending transaction", error);
  }
};
