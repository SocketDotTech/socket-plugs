import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import {
  Hooks,
  ProjectConstants,
  ProjectType,
  tokensWithOnePoolId,
} from "../../../src";
import { Tokens } from "../../../src/enums";
import { getMode } from "../../constants";
import { initialLimitsForSuperbridge } from "../common";
import { ChainsInfo, SuperTokenInfo, TokenInfo, TokenRateLimits } from "./main";

export const buildProjectConstants = async (
  tokenInfo: TokenInfo,
  chainsInfo: ChainsInfo,
  hookType: Hooks,
  isLimitsRequired: boolean,
  tokenLimitInfo: TokenRateLimits,
  allChains: ChainSlug[]
) => {
  const deploymentMode = getMode();
  const projectConstants: ProjectConstants = {
    [deploymentMode]: {},
  };

  for (const token of tokenInfo.tokens) {
    const poolCount = tokensWithOnePoolId.includes(token) ? 1 : undefined; // If poolCount is not 1, assign undefined to avoid adding poolCount 0 in constants file.
    const limitsAndPoolId = {};
    for (const chain of allChains) {
      limitsAndPoolId[chain] = {
        [IntegrationTypes.fast]: { ...tokenLimitInfo[token], poolCount },
      };
    }

    projectConstants[deploymentMode][token] = {
      vaultChains: chainsInfo.vaultChains,
      controllerChains: chainsInfo.controllerChains,
      tokenAddresses: tokenInfo.tokenAddresses?.[token],
      mergeInboundWithTokens: tokenInfo?.mergeInboundWithTokens?.[token],
      hook: {
        hookType,
      },
    };

    const superTokenInfo = tokenInfo.superTokenInfoMap?.[token];
    if (superTokenInfo) {
      delete superTokenInfo.currentAddresses;
      projectConstants[deploymentMode][token].superTokenInfo = superTokenInfo;
    }

    if (isLimitsRequired) {
      projectConstants[deploymentMode][token].hook.limitsAndPoolId =
        limitsAndPoolId;
    }
  }

  return JSON.parse(JSON.stringify(projectConstants)); // stringify and parse to remove undefined values
};

export const getInitialLimitValue = async (
  projectType: ProjectType,
  token: Tokens,
  superTokenInfoMap: Record<string, SuperTokenInfo> = {}
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    return (
      initialLimitsForSuperbridge[token] ?? {
        sendingLimit: 0,
        receivingLimit: 0,
      }
    );
  } else if (projectType == ProjectType.SUPERTOKEN) {
    const info = superTokenInfoMap[token.toUpperCase()];
    return {
      sendingLimit: info?.initialSupply
        ? parseInt(info?.initialSupply) / 100
        : 0,
      receivingLimit: info?.initialSupply
        ? parseInt(info?.initialSupply) / 100
        : 0,
    };
    // think about using initial supply
  }
};
