import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { BigNumber, utils } from "ethers";
import { tokenDecimals } from "../../src";
import { ProjectTokenConstants, SuperTokenConstants } from "../constants/types";
import {
  getMode,
  getProject,
  getToken,
  getTokenProject,
} from "../constants/config";

export const isAppChain = (chain: ChainSlug) =>
  getProjectTokenConstants().appChain === chain;

export const isSuperTokenVaultChain = (chain: ChainSlug) =>
  getSuperTokenConstants().vaultChains.includes(chain);

let pc: ProjectTokenConstants;
export const getProjectTokenConstants = (): ProjectTokenConstants => {
  if (pc) return pc;
  const _pc = require(`../constants/project-constants/${getProject()}`);
  pc = _pc?.[getMode()]?.[getToken()];
  if (!pc)
    throw new Error(
      `config not found for ${getProject()}, ${getMode()}, ${getToken()}`
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

export const getIntegrationTypeConsts = (
  it: IntegrationTypes,
  nonAppChain: ChainSlug
) => {
  const pci = getProjectTokenConstants().limits[nonAppChain]?.[it];
  if (!pci) throw new Error("invalid integration for mode and project");
  return pci;
};

export const getLimitBN = (
  it: IntegrationTypes,
  nonAppChain: ChainSlug,
  isSending: boolean
): BigNumber => {
  if (isSending) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, nonAppChain).sendingLimit,
      tokenDecimals[getToken()]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, nonAppChain).receivingLimit,
      tokenDecimals[getToken()]
    );
  }
};

export const getRateBN = (
  it: IntegrationTypes,
  nonAppChain: ChainSlug,
  isSending: boolean
): BigNumber => {
  if (isSending) {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, nonAppChain).sendingRate,
      tokenDecimals[getToken()]
    );
  } else {
    return utils.parseUnits(
      getIntegrationTypeConsts(it, nonAppChain).receivingRate,
      tokenDecimals[getToken()]
    );
  }
};
