import {
  ChainSlug,
  DeploymentMode,
  Hooks,
  IntegrationTypes,
  Project,
  ProjectType,
  SuperTokenType,
  Tokens,
} from "../../src";

export type ProjectConstantsMap = {
  [key in Project]: ProjectConstants;
};

export type ProjectConstants = {
  [key in DeploymentMode]?: {
    [key in Tokens]?: ProjectTokenConstants;
  };
};

export type ProjectTokenConstants = {
  nonAppChains: ChainSlug[];
  appChain: ChainSlug;
  isFiatTokenV2_1?: boolean;
  hook?: Hooks;
  hookInfo?: {
    debtRatio?: number;
    rebalanceDelay?: number;
    strategy?: string;
    underlyingAsset?: string;
  };
  projectType: ProjectType;
  limits?: {
    [key in ChainSlug]?: {
      [key in IntegrationTypes]?: {
        sendingLimit: string;
        sendingRate: string;
        receivingLimit: string;
        receivingRate: string;
        poolCount: number;
      };
    };
  };
};

export type TokenConstants = {
  [key in DeploymentMode]?: {
    [key in Tokens]?: SuperTokenConstants;
  };
};
export type SuperTokenConstants = {
  superTokenChains: ChainSlug[];
  vaultChains: ChainSlug[];
  hook?: Hooks;
  tokenInfo: {
    name: string;
    symbol: string;
    decimals: number;
    initialSupplyOwner: string;
    owner: string;
    initialSupply: number;
  };
  hookInfo?: {
    yieldToken?: string;
    debtRatio?: number;
    rebalanceDelay?: number;
    strategy?: string;
    underlyingAsset?: string;
  };
  projectType: ProjectType;
  limits?: {
    [key in ChainSlug]?: {
      [key in IntegrationTypes]?: {
        sendingLimit: string;
        sendingRate: string;
        receivingLimit: string;
        receivingRate: string;
        poolCount: number;
      };
    };
  };
};
