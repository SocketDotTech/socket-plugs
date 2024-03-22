import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { BigNumber, utils } from "ethers";
import { ProjectType, tokenDecimals } from "../../src";
import { ProjectTokenConstants, SuperTokenConstants } from "../constants/types";
import {
  getMode,
  getProjectType,
  getSuperBridgeProject,
  getToken,
  getTokenProject,
} from "../constants/config";

export const isAppChain = (chain: ChainSlug) =>
  getBridgeProjectTokenConstants().appChain === chain;

export const isSuperTokenVaultChain = (chain: ChainSlug) =>
  getSuperTokenConstants().vaultChains.includes(chain);

let pc: ProjectTokenConstants;
export const getBridgeProjectTokenConstants = (): ProjectTokenConstants => {
  if (pc) return pc;
  const _pc = require(`../constants/project-constants/${getSuperBridgeProject()}`);
  pc = _pc?.[getMode()]?.[getToken()];
  if (!pc)
    throw new Error(
      `config not found for ${getSuperBridgeProject()}, ${getMode()}, ${getToken()}`
    );
  return pc;
};

let tc: SuperTokenConstants;
export const getSuperTokenConstants = (): SuperTokenConstants => {
  if (tc) return tc;
  const _tc = require(`../constants/token-constants/${getTokenProject()}`);
  tc = _tc?.[getMode()];
  if (!tc)
    throw new Error(`config not found for ${getTokenProject()}, ${getMode()}}`);
  return tc;
};

export const getConstants = () => {
  const projectType = getProjectType();
  if (projectType === ProjectType.SUPERBRIDGE) return getBridgeProjectTokenConstants();
  if (projectType === ProjectType.SUPERTOKEN) return getSuperTokenConstants();
}

export const getIntegrationTypeConsts = (
  it: IntegrationTypes,
  chain: ChainSlug
) => {
  const pci = getConstants().limits[chain]?.[it];
  if (!pci) throw new Error("invalid integration for mode and project");
  return pci;
};

export const getLimitBN = (
  it: IntegrationTypes,
  chain: ChainSlug,
  isSending: boolean
): BigNumber => {
  if (isSending) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, chain).sendingLimit,
      tokenDecimals[getToken()]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, chain).receivingLimit,
      tokenDecimals[getToken()]
    );
  }
};

export const getRateBN = (
  it: IntegrationTypes,
  chain: ChainSlug,
  isSending: boolean
): BigNumber => {
  if (isSending) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, chain).sendingRate,
      tokenDecimals[getToken()]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, chain).receivingRate,
      tokenDecimals[getToken()]
    );
  }
};
