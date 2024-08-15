import { BigNumber, Wallet } from "ethers";
import { ChainSlug, DeploymentMode, IntegrationTypes } from "./core";
import {
  CommonContracts,
  HookContracts,
  Hooks,
  ProjectType,
  SuperBridgeContracts,
  SuperTokenContracts,
} from "./enum";
import { Project, Tokens } from "./enums";

export type ProjectConstantsMap = {
  [key in Project]: ProjectConstants;
};

export type ProjectConstants = {
  [key in DeploymentMode]?: {
    [key in Tokens]?: TokenConstants;
  };
};

export type TokenConstants = {
  controllerChains: number[];
  vaultChains: number[];
  mergeInboundWithTokens?: Tokens[];
  tokenAddresses?: {
    [chainSlug: number]: string;
  };
  // for superbridge project, controller chains
  isFiatTokenV2_1?: boolean;
  // for supertoken project, controller chain
  superTokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
    initialSupplyOwner: string;
    owner: string;
    initialSupply: string;
    initialChain?: number;
  };
  // for superbridge yield project, controller chain
  yieldTokenInfo?: {
    name: string;
    symbol: string;
    decimals: number;
  };
  hook: {
    hookType: Hooks;
    // for limitHook, limitExecutionHook
    limitsAndPoolId?: {
      [chainSlug: number]: {
        [key in IntegrationTypes]?: {
          sendingLimit: string;
          receivingLimit: string;
          // for superbridge project, vault chains
          poolCount?: number;
        };
      };
    };
    // for superbridge project, yield hook, vault chain
    yieldVaultInfo?: {
      debtRatio: number;
      rebalanceDelay: number;
      strategy: string;
      underlyingAsset: string;
    };
  };
};

export type Connectors = {
  [chainSlug in ChainSlug]?: ConnectorAddresses;
};

export type ConnectorAddresses = {
  [integration in IntegrationTypes]?: string;
};

export interface CommonAddresses {
  connectors: Connectors;
  [HookContracts.LimitHook]?: string;
  [HookContracts.LimitExecutionHook]?: string;
  [HookContracts.ExecutionHelper]?: string;
}

export interface AppChainAddresses extends CommonAddresses {
  isAppChain: true;
  [SuperBridgeContracts.MintableToken]: string;
  [SuperBridgeContracts.Controller]: string;
  [HookContracts.ControllerYieldLimitExecutionHook]?: string;
}

export interface NonAppChainAddresses extends CommonAddresses {
  isAppChain: false;
  [SuperBridgeContracts.NonMintableToken]: string;
  [SuperBridgeContracts.Vault]: string;
  [HookContracts.VaultYieldLimitExecutionHook]?: string;
}

export type SBTokenAddresses = AppChainAddresses | NonAppChainAddresses;

export type SBAddresses = {
  [chainSlug in ChainSlug]?: {
    [token in Tokens]?: SBTokenAddresses;
  };
};

export interface STControllerChainAddresses extends CommonAddresses {
  [SuperTokenContracts.SuperToken]: string;
  [CommonContracts.Controller]: string;
}

export interface STVaultChainAddresses extends CommonAddresses {
  [CommonContracts.NonMintableToken]: string;
  [CommonContracts.Vault]: string;
}

export type STTokenAddresses =
  | STControllerChainAddresses
  | STVaultChainAddresses;

export type STAddresses = {
  [chainSlug in ChainSlug]?: {
    [token in Tokens]?: STTokenAddresses;
  };
};

export interface DeployParams {
  addresses: SBTokenAddresses | STTokenAddresses;
  signer: Wallet;
  currentChainSlug: number;
  currentToken: Tokens;
  hookType?: Hooks;
  mergeInboundWithTokens: Tokens[];
  tc: TokenConstants;
}

export type UpdateLimitParams = [
  boolean,
  string,
  string | number | BigNumber,
  string | number | BigNumber
];

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: SBTokenAddresses;
}

export type AllAddresses = Record<string, STAddresses | SBAddresses>;

export interface SocketPlugsConfig {
  tokenDecimals: { [key in Tokens]: number };
  tokenSymbols: { [key in Tokens]: string };
  tokenAddresses: {
    [key in ChainSlug]?: { [key in Tokens]?: string };
  };
  projects: string[];
  tokens: string[];
}
