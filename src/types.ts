import { ChainSlug, IntegrationTypes } from "./core";

export enum Tokens {
  Moon = "MOON",
  USDC = "USDC",
}

export enum Project {
  AEVO = "aevo",
  LYRA = "lyra",
  SX_NETWORK_TESTNET = "sx-network-testnet",
}

export enum SuperBridgeContracts {
  MintableToken = "MintableToken",
  NonMintableToken = "NonMintableToken",
  Vault = "Vault",
  Controller = "Controller",
  ExchangeRate = "ExchangeRate",
  ConnectorPlug = "ConnectorPlug",
}

export type ProjectAddresses = {
  [chainSlug in ChainSlug]?: ChainAddresses;
};

export type ChainAddresses = {
  [token in Tokens]?: TokenAddresses;
};

export type TokenAddresses = AppChainAddresses | NonAppChainAddresses;

export interface AppChainAddresses {
  isAppChain: true;
  [SuperBridgeContracts.MintableToken]?: string;
  [SuperBridgeContracts.Controller]?: string;
  [SuperBridgeContracts.ExchangeRate]?: string;
  connectors?: Connectors;
}

export interface NonAppChainAddresses {
  isAppChain: false;
  [SuperBridgeContracts.NonMintableToken]?: string;
  [SuperBridgeContracts.Vault]?: string;
  connectors?: Connectors;
}

export type Connectors = {
  [chainSlug in ChainSlug]?: ConnectorAddresses;
};

export type ConnectorAddresses = {
  [integration in IntegrationTypes]?: string;
};
