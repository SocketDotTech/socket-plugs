import { ChainSlug, IntegrationTypes } from "./core";

export enum Tokens {
  Moon = "MOON",
  USDCE = "USDC.e",
  USDC = "USDC",
  WETH = "WETH",
  WBTC = "WBTC",
  USDT = "USDT",
  SNX = "SNX",
  WSTETH = "wstETH",
  DAI = "DAI",
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
  LEAF_TESTNET = "leaf-testnet",
  SAND_TESTNET = "sand-testnet",
  REYA_CRONOS = "reya-cronos",
}

export enum Hooks {
  LIMIT_HOOK = "LIMIT_HOOK",
  LIMIT_EXECUTION_HOOK = "LIMIT_EXECUTION_HOOK",
  YIELD_LIMIT_EXECUTION_HOOK = "YIELD_LIMIT_EXECUTION_HOOK",
  // CONTROLLER_YIELD_LIMIT_EXECUTION_HOOK = "CONTROLLER_YIELD_LIMIT_EXECUTION_HOOK",
  // VAULT_YIELD_LIMIT_EXECUTION_HOOK = "VAULT_YIELD_LIMIT_EXECUTION_HOOK",
}

export enum ProjectType {
  SUPERBRIDGE = "superbridge",
  SUPERTOKEN = "supertoken",
}

export enum CommonContracts {
  Vault = "Vault",
  Controller = "Controller",
  NonMintableToken = "NonMintableToken",
}

export enum TokenContracts {
  NonMintableToken = "NonMintableToken",
  MintableToken = "MintableToken",
  SuperToken = "SuperToken",
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

export interface CommonAddresses {
  connectors?: Connectors;
  [HookContracts.LimitHook]?: string;
  [HookContracts.LimitExecutionHook]?: string;
  [HookContracts.ExecutionHelper]?: string;
}
export interface AppChainAddresses extends CommonAddresses {
  isAppChain: true;
  [SuperBridgeContracts.MintableToken]?: string;
  [SuperBridgeContracts.Controller]?: string;
  [HookContracts.ControllerYieldLimitExecutionHook]?: string;
}

export interface NonAppChainAddresses extends CommonAddresses {
  isAppChain: false;
  [SuperBridgeContracts.NonMintableToken]?: string;
  [SuperBridgeContracts.Vault]?: string;
  [HookContracts.VaultYieldLimitExecutionHook]?: string;
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
  [ChainSlug.REYA_CRONOS]: Project.REYA_CRONOS,
};

////// **** SUPER TOKEN TYPES **** //////

export enum SuperTokenType {
  WITH_LIMIT_AND_PAYLOAD_EXECUTION = "WITH_LIMIT_AND_PAYLOAD_EXECUTION",
  WITH_LIMIT = "WITH_LIMIT",
}

export enum HookContracts {
  LimitHook = "LimitHook",
  LimitExecutionHook = "LimitExecutionHook",
  ControllerYieldLimitExecutionHook = "Controller_YieldLimitExecHook",
  VaultYieldLimitExecutionHook = "Vault_YieldLimitExecHook",
  ExecutionHelper = "ExecutionHelper",
}
export enum SuperTokenContracts {
  NonSuperToken = "NonSuperToken",
  SuperToken = "SuperToken",
}

export type SuperTokenProjectAddresses = {
  [chainSlug in ChainSlug]?: SuperTokenChainAddresses;
};

export type SuperTokenChainAddresses =
  | SuperTokenControllerChainAddresses
  | SuperTokenVaultChainAddresses;

export interface SuperTokenControllerChainAddresses extends CommonAddresses {
  [SuperTokenContracts.SuperToken]?: string;
  [CommonContracts.Controller]?: string;
}

export interface SuperTokenVaultChainAddresses extends CommonAddresses {
  [SuperTokenContracts.NonSuperToken]?: string;
  [CommonContracts.Vault]?: string;
}
