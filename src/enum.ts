export enum Tokens {
  Moon = "MOON",
  USDCE = "USDC.e",
  USDC = "USDC",
  WETH = "WETH",
  WBTC = "WBTC",
  USDT = "USDT",
  SNX = "SNX",
  WSTETH = "wstETH",
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
  SOUND_TESTNET = "sound-testnet",
  RAIN_TESTNET = "rain-testnet",
}

export enum Hooks {
  NO_HOOK = "NO_HOOK",
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

export enum SuperBridgeContracts {
  MintableToken = "MintableToken",
  NonMintableToken = "NonMintableToken",
  Vault = "Vault",
  Controller = "Controller",
  FiatTokenV2_1_Controller = "FiatTokenV2_1_Controller",
  ExchangeRate = "ExchangeRate",
  ConnectorPlug = "ConnectorPlug",
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
