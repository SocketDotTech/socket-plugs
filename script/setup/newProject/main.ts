import { ChainSlug } from "@socket.tech/dl-core";
import { NFTs, Tokens } from "../../../src/enums";
import { buildEnvFile, updateProjectEnums } from "../configUtils";
import { generateConstantsFile } from "../generateConstants";
import { getChainsInfo } from "./chainInfo";
import { getHookRelatedInfo } from "./hookInfo";
import { getProjectInfo } from "./projectInfo";
import { getProjectTokenListInfo } from "./tokenInfo";
import { buildNFTProjectConstants, buildProjectConstants } from "./utils";
import { TokenType } from "../../../src";
import { getProjectNFTInfo } from "./nftInfo";

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

export type NFTInfo = {
  nft: NFTs;
  nftAddresses?: {
    [key in NFTs]?: {
      [chainslug in ChainSlug]?: string;
    };
  };
};

export type ChainsInfo = {
  vaultChains: ChainSlug[];
  controllerChains: ChainSlug[];
};
export const tokenEnum = Tokens;
export const nftEnum = NFTs;

export const addProject = async () => {
  const projectConfig = await getProjectInfo();
  const {
    projectName,
    projectType,
    hookType,
    owner,
    tokenType,
    isLimitsRequired,
    chainOptions,
  } = projectConfig;

  const chainsInfo: ChainsInfo = await getChainsInfo(projectType, chainOptions);
  const { vaultChains, controllerChains } = chainsInfo;
  const allChains = [...chainsInfo.vaultChains, ...chainsInfo.controllerChains];

  if (tokenType === TokenType.ERC20) {
    const tokenInfo: TokenInfo = await getProjectTokenListInfo(
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

    const projectConstants = await buildProjectConstants(
      tokenInfo,
      chainsInfo,
      hookType,
      isLimitsRequired,
      tokenLimitInfo,
      allChains
    );
    generateConstantsFile(projectType, projectName, projectConstants);
  } else {
    // ERC721, 1155
    const nftInfo: NFTInfo = await getProjectNFTInfo(
      projectType,
      vaultChains,
      controllerChains
    );
    await updateProjectEnums(projectConfig.projectName, projectType);
    console.log(`✔  Updated Enums :Project`);
    await buildEnvFile(
      projectConfig.projectName,
      projectConfig.projectType,
      projectConfig.owner,
      [nftInfo.nft],
      allChains
    );

    const projectConstants = await buildNFTProjectConstants(
      nftInfo,
      chainsInfo,
      hookType
    );
    generateConstantsFile(projectType, projectName, projectConstants);
  }
  console.log(
    `✔ Setup done! You can run this script again to add new projects, add new tokens, or edit project`
  );
};
