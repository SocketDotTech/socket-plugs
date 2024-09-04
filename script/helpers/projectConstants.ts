import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { BigNumber, utils } from "ethers";
import { ProjectConstants, TokenConstants } from "../../src";
import { getMode, getProjectName } from "../constants/config";
import { getConstantPath } from "./utils";
import { tokenDecimals } from "../../src/enums/tokenDecimals";
import { ethers } from "hardhat";

export const isSBAppChain = (chain: ChainSlug, token: string) =>
  getTokenConstants(token).controllerChains.includes(chain);

export const isSTVaultChain = (chain: ChainSlug, token: string) =>
  getTokenConstants(token).vaultChains.includes(chain);

let pc: ProjectConstants;

export const getTokenConstants = (tokenName: string): TokenConstants => {
  let pc_ = getProjectConstants();
  const tc = pc_?.[getMode()]?.[tokenName];
  if (!tc)
    throw new Error(
      `config not found for ${getProjectName()}, ${getMode()}, ${tokenName}`
    );
  return tc;
};

export const getProjectConstants = (): ProjectConstants => {
  if (pc) return pc;
  pc = require(getConstantPath()).pc;
  return pc;
};

export const getIntegrationTypeConsts = (
  it: IntegrationTypes,
  chain: ChainSlug,
  tokenName: string
) => {
  const pci = getTokenConstants(tokenName).hook?.limitsAndPoolId?.[chain]?.[it];
  if (!pci) throw new Error("invalid integration for mode and project");
  return pci;
};

export const getLimitBN = (
  it: IntegrationTypes,
  chain: ChainSlug,
  token: string,
  isSending: boolean
): BigNumber => {
  if (isSending) {
    const sendingLimit = getIntegrationTypeConsts(
      it,
      chain,
      token
    ).sendingLimit;
    return utils.parseUnits(sendingLimit, tokenDecimals[token]);
  } else {
    const receivingLimit = getIntegrationTypeConsts(
      it,
      chain,
      token
    ).receivingLimit;
    return utils.parseUnits(receivingLimit, tokenDecimals[token]);
  }
};

export const getRateBN = (
  it: IntegrationTypes,
  chain: ChainSlug,
  token: string,
  isSending: boolean
): BigNumber => {
  const limitBN = getLimitBN(it, chain, token, isSending);
  const rate: string | number = getIntegrationTypeConsts(it, chain, token)[
    isSending ? "sendingRatePerSecond" : "receivingRatePerSecond"
  ];
  if (!rate || rate == "") {
    return limitBN.div(86400); // default to daily
  } else {
    return utils.parseUnits(rate, tokenDecimals[token]);
  }
};
