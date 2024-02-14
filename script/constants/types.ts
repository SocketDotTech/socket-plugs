import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
  Project,
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
  isFiatTokenV2_1?: boolean;
  appChain: ChainSlug;
  nonAppChains: {
    [key in ChainSlug]?: {
      [key in IntegrationTypes]?: {
        depositLimit: string;
        depositRate: string;
        withdrawLimit: string;
        withdrawRate: string;
        poolCount: number;
      };
    };
  };
};

export type TokenConstants = {
  [key in DeploymentMode]?: TokenConfigs;
};

export type TokenConfigs = {
  type: SuperTokenType;
  projectName: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimal: number;
  initialSupplyOwner: string;
  owner: string;
  initialSupply: number;
  superTokenChains: ChainSlug[];
  vaultTokens?: {
    [key in ChainSlug]?: string;
  };
  integrationType: IntegrationTypes;
  bridgeLimit: string;
  bridgeRate: string;
};
