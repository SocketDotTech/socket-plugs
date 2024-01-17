import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
  Project,
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
  appChain: ChainSlug;
  nonAppChains: ChainSlug[];
  isFiatTokenV2_1?: boolean;
  integrationTypes: {
    [key in IntegrationTypes]?: {
      depositLimit: string;
      depositRate: string;
      withdrawLimit: string;
      withdrawRate: string;
      poolCount: number;
    };
  };
};
