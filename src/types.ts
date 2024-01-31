import { ChainSlug, IntegrationTypes } from "./core";

export enum Tokens {
  Moon = "MOON",
  USDCE = "USDC.e",
  USDC = "USDC",
  WETH = "WETH",
  WBTC = "WBTC",
  USDT = "USDT",
}

export enum Project {
  AEVO = "aevo",
  AEVO_TESTNET = "aevo-testnet",
  LYRA_TESTNET = "lyra-testnet",
  LYRA = "lyra",
  SX_NETWORK_TESTNET = "sx-network-testnet",
  SOCKET_DEV = "socket-dev",
  MODE_TESTNET = "mode-testnet",
  VICTION_TESTNET = "viction-testnet",
  MODE = "mode",
  ANCIENT8_TESTNET2 = "ancient8-testnet2",
}

////// **** SUPER BRIDGE TYPES **** //////

export enum SuperBridgeContracts {
  MintableToken = "MintableToken",
  NonMintableToken = "NonMintableToken",
  Vault = "Vault",
  Controller = "Controller",
  FiatTokenV2_1_Controller = "FiatTokenV2_1_Controller",
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

export const ChainSlugToProject: { [chainSlug in ChainSlug]?: Project } = {
  [ChainSlug.AEVO]: Project.AEVO,
  [ChainSlug.AEVO_TESTNET]: Project.AEVO_TESTNET,
  [ChainSlug.LYRA_TESTNET]: Project.LYRA_TESTNET,
  [ChainSlug.LYRA]: Project.LYRA,
  [ChainSlug.SX_NETWORK_TESTNET]: Project.SX_NETWORK_TESTNET,
  // [ChainSlug.OPTIMISM_SEPOLIA]: Project.SOCKET_DEV,
  [ChainSlug.MODE_TESTNET]: Project.MODE_TESTNET,
  [ChainSlug.VICTION_TESTNET]: Project.VICTION_TESTNET,
  [ChainSlug.MODE]: Project.MODE,
  [ChainSlug.ANCIENT8_TESTNET2]: Project.ANCIENT8_TESTNET2,
};

////// **** SUPER TOKEN TYPES **** //////

export enum SuperTokenContracts {
  NonSuperToken = "NonSuperToken",
  SuperToken = "SuperToken",
  SuperTokenVault = "SuperTokenVault",
  SocketPlug = "SocketPlug",
  ExecutionHelper = "ExecutionHelper",
}

export type SuperTokenAddresses = {
  [chainSlug in ChainSlug]?: SuperTokenChainAddresses;
};

export type SuperTokenChainAddresses = {
  [SuperTokenContracts.NonSuperToken]?: string;
  [SuperTokenContracts.SuperToken]?: string;
  [SuperTokenContracts.SuperTokenVault]?: string;
  [SuperTokenContracts.SocketPlug]: string;
};
