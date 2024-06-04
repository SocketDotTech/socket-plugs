import { Contract } from "ethers";
import { ChainSlug } from "@socket.tech/dl-core";
import { printExecSummary, getProjectAddresses } from "../helpers";
import { getTokenConstants } from "../helpers/projectConstants";
import {
  Connectors,
  TokenConstants,
  SBAddresses,
  STAddresses,
  SBTokenAddresses,
  STTokenAddresses,
  HookContracts,
} from "../../src";
import { getTokens } from "../constants/config";
import { connectorStatus, filterChains, siblingFilterChains } from "./utils";
import { verifyConstants } from "../helpers/verifyConstants";
import {
  getBridgeContract,
  getHookContract,
  updateLimitsAndPoolId,
} from "../helpers/common";
import { Tokens } from "../../src/enums";

let pc: { [token: string]: TokenConstants } = {};
let tokens: Tokens[];

export const main = async () => {
  try {
    await verifyConstants();
    tokens = getTokens();

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
          let { hookContract, hookContractName } = await getHookContract(
            chain,
            token,
            addr
          );

          if (
            [
              HookContracts.LimitHook,
              HookContracts.LimitExecutionHook,
            ].includes(hookContractName as HookContracts)
          ) {
            await updateLimitsAndPoolId(
              chain,
              token,
              siblingSlugs,
              addr,
              connectors,
              hookContract
            );
          }
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
