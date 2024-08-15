import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../../src/enums";
import { buildEnvFile, updateProjectEnums } from "../configUtils";
import { generateConstantsFile } from "../generateConstants";
import { getChainsInfo } from "./chainInfo";
import { getHookRelatedInfo } from "./hookInfo";
import { getProjectInfo } from "./projectInfo";
import { getProjectTokenListInfo } from "./tokenInfo";
import { buildProjectConstants } from "./utils";

export type TokenRateLimits = Record<
  string,
  { sendingLimit: number; receivingLimit: number }
>;

export type SuperTokenInfo = {
  name: string;
  symbol: string;
  decimals: number;
  owner: string;
  initialSupplyOwner: string;
  initialSupply: string;
  initialChain?: ChainSlug;
  currentAddresses?: { chainSlug: ChainSlug; address: string; token: string }[];
};

export type TokenInfo = {
  tokens: Tokens[];
  superTokenInfoMap?: Record<string, SuperTokenInfo>;
  mergeInboundWithTokens?: {
    [key in Tokens]?: Tokens[];
  };
  tokenAddresses?: {
    [key in Tokens]?: {
      [chainslug in ChainSlug]?: string;
    };
  };
};

export type ChainsInfo = {
  vaultChains: ChainSlug[];
  controllerChains: ChainSlug[];
};
export let tokenEnum = Tokens;

export const addProject = async () => {
  const projectConfig = await getProjectInfo();
  let {
    projectName,
    projectType,
    hookType,
    owner,
    isLimitsRequired,
    chainOptions,
  } = projectConfig;

  let chainsInfo: ChainsInfo = await getChainsInfo(projectType, chainOptions);
  let { vaultChains, controllerChains } = chainsInfo;
  const allChains = [...chainsInfo.vaultChains, ...chainsInfo.controllerChains];

  let tokenInfo: TokenInfo = await getProjectTokenListInfo(
    projectType,
    owner,
    vaultChains,
    controllerChains
  );
  const { tokenLimitInfo } = await getHookRelatedInfo(
    projectType,
    isLimitsRequired,
    tokenInfo.tokens,
    tokenInfo.superTokenInfoMap
  );
  await updateProjectEnums(projectConfig.projectName, projectType);
  console.log(`✔  Updated Enums :Project`);
  await buildEnvFile(
    projectConfig.projectName,
    projectConfig.projectType,
    projectConfig.owner,
    tokenInfo.tokens,
    allChains
  );

  let projectConstants = await buildProjectConstants(
    tokenInfo,
    chainsInfo,
    hookType,
    isLimitsRequired,
    tokenLimitInfo,
    allChains
  );
  generateConstantsFile(projectType, projectName, projectConstants);

  console.log(
    `✔ Setup done! You can run this script again to add new projects, add new tokens, or edit project`
  );
};
