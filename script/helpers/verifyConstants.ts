import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { ChainSlug } from "@socket.tech/dl-core";
import { isSuperBridge, isSuperToken, getConfigs } from "../constants/config";
import { checkMissingFields } from "../helpers";
import { Hooks, ProjectType, TokenConstants } from "../../src";
import { getTokenConstants } from "../helpers/projectConstants";
import { Tokens } from "../../src/enums";

let projectType: ProjectType;
let pc: { [token: string]: TokenConstants } = {};
let projectName: string;
let tokens: Tokens[];

export const verifyConstants = async () => {
  ({ projectName, projectType, tokens } = getConfigs());

  for (let token of tokens) {
    console.log(`\nVerifying ${token}...`);
    pc[token] = getTokenConstants(token);
    let currentPc = pc[token];
    let allChains = [...currentPc.controllerChains, ...currentPc.vaultChains];
    if (isSuperBridge()) {
      if (currentPc.controllerChains.length != 1) {
        throw new Error("SuperBridge can only have one controllerChains");
      }
    }
    if (isSuperToken()) {
      if (currentPc.vaultChains.length > 1) {
        throw new Error("SuperToken can only have 1 or 0 vaultChains");
      }
      let { superTokenInfo } = currentPc;
      checkMissingFields({ superTokenInfo });
      let { name, symbol, decimals, initialSupplyOwner, owner, initialSupply } =
        superTokenInfo!;
      checkMissingFields({
        name,
        symbol,
        decimals,
        initialSupplyOwner,
        owner,
        initialSupply,
      });
    }

    if (currentPc.hook) {
      let { hookType, limitsAndPoolId, yieldVaultInfo } = currentPc.hook;
      checkMissingFields({ hookType });
      if (
        hookType == Hooks.LIMIT_HOOK ||
        hookType == Hooks.LIMIT_EXECUTION_HOOK ||
        hookType == Hooks.KINTO_HOOK
      ) {
        checkMissingFields({ limitsAndPoolId });
        let chainsWithLimits = Object.keys(limitsAndPoolId!);
        for (let chain of allChains) {
          if (!chainsWithLimits.includes(chain.toString())) {
            throw new Error(
              `Limits not found for chain ${chain} in token ${token}`
            );
          }
        }
        for (let chain in limitsAndPoolId) {
          let chainLimits = limitsAndPoolId[chain];
          for (let integration in chainLimits) {
            let { sendingLimit, receivingLimit } = chainLimits[integration];
            checkMissingFields({ sendingLimit, receivingLimit });
          }
        }
      }
      if (hookType == Hooks.YIELD_LIMIT_EXECUTION_HOOK) {
        let { yieldTokenInfo } = currentPc;
        checkMissingFields({ yieldTokenInfo });
        let { name, symbol, decimals } = yieldTokenInfo!;
        checkMissingFields({
          name,
          symbol,
          decimals,
        });

        checkMissingFields({ yieldVaultInfo });
        let { debtRatio, rebalanceDelay, strategy, underlyingAsset } =
          yieldVaultInfo!;
        checkMissingFields({
          debtRatio,
          rebalanceDelay,
          strategy,
          underlyingAsset,
        });
      }
    }
  }
};
