import { Contract, utils } from "ethers";
import prompts from "prompts";
import { buildEnvFile, updateProjectEnums } from "./configUtils";
import { Hooks, ProjectConstants, ProjectType } from "../../src";
import {
  ChainSlug,
  ChainSlugToKey,
  DeploymentMode,
  IntegrationTypes,
  MainnetIds,
  TestnetIds,
} from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { generateConstantsFile } from "./generateConstants";
import { generateTokenAddressesFile } from "./updateExistingTokenAddresses";
import {
  ProjectConfig,
  getTokenMetadata,
  validateEthereumAddress,
} from "./common";
import { chainSlugReverseMap } from "./enumMaps";
import { getProviderFromChainSlug } from "../helpers";

type TokenRateLimits = Record<
  string,
  { sendingLimit: number; receivingLimit: number }
>;

export const addProject = async () => {
  const projectConfig = await getProjectInfo();
  let { projectName, projectType, hookType, isLimitsRequired, chainOptions } =
    projectConfig;

  let chainsInfo = await getChainsInfo(projectType, chainOptions);

  const allChains = [...chainsInfo.vaultChains, ...chainsInfo.controllerChains];
  await updateProjectEnums(projectConfig.projectName, projectType);
  console.log(`✔  Updated Enums :Project`);

  let tokenInfo: {
    tokens: Tokens[];
  } = await getProjectTokenListInfo(projectType);

  await buildEnvFile(
    projectConfig.projectName,
    projectConfig.projectType,
    projectConfig.owner,
    tokenInfo.tokens,
    allChains
  );

  const { tokenLimitInfo } = await getHookRelatedInfo(
    isLimitsRequired,
    tokenInfo.tokens
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
};

export const getProjectInfo = async () => {
  const currentOwnerAddress = process.env.OWNER_ADDRESS;
  let projectInfo: ProjectConfig = await prompts([
    {
      name: "projectType",
      type: "select",
      choices: [
        {
          title: "SuperBridge",
          value: ProjectType.SUPERBRIDGE,
        },
        {
          title: "SuperToken",
          value: ProjectType.SUPERTOKEN,
        },
      ],
      message: "Select project type",
    },
    {
      name: "projectName",
      type: "text",
      message:
        "Enter project name (use underscore instead of spaces, eg: socket_bridge)",
    },
    {
      name: "owner",
      type: "text",
      message:
        "Enter owner Address * (Owner will be the deployer initially to configure roles)",
      initial: currentOwnerAddress,
      validate: (value) => validateEthereumAddress(value.trim()),
    },
    {
      name: "hookType",
      type: "select",
      choices: [
        {
          title: "Limit Hook",
          value: Hooks.LIMIT_HOOK,
        },
        {
          title: "Limit Execution Hook",
          value: Hooks.LIMIT_EXECUTION_HOOK,
        },
        {
          title: "No Hook",
          value: Hooks.NO_HOOK,
        },
      ],
      message: "Select Hook type (Recommended: Limit Hook)",
    },
    {
      name: "isMainnet",
      type: "toggle",
      message: "Is the deployment for mainnet?",
      active: "yes",
      inactive: "no",
    },
  ]);

  projectInfo.projectName = projectInfo.isMainnet
    ? projectInfo.projectName + "_mainnet"
    : projectInfo.projectName + "_testnet";
  projectInfo.projectName = projectInfo.projectName.toLowerCase().trim();
  projectInfo.owner = projectInfo.owner.trim();
  let isLimitsRequired =
    projectInfo.hookType === Hooks.LIMIT_HOOK ||
    projectInfo.hookType === Hooks.LIMIT_EXECUTION_HOOK;
  let possibleChains = projectInfo.isMainnet ? MainnetIds : TestnetIds;
  let chainOptions = possibleChains.map((chain) => ({
    title: chainSlugReverseMap.get(String(chain)),
    value: chain,
  }));
  return { ...projectInfo, isLimitsRequired, chainOptions };
};

export const getChainsInfo = async (
  projectType: ProjectType,
  chainOptions: { title: string; value: number }[]
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select vault chains (src chains, where token is already present and will be locked in bridge contract. check README for more info)",
        choices: chainOptions,
        min: 1,
        max: 20,
      },
    ]);

    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "select",
        message:
          "Select controller chain (app chain, where token will be minted/burned. check README for more info)",
        choices: controllerChainOptions,
      },
    ]);
    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: [controllerChainsInfo.controllerChains],
    };
  } else {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select a vault chain, if applicable (where token is already present and will be locked to bridge to other chains. Press enter without selecting anything if fresh supertoken deployment. check README for more info)",
        choices: chainOptions,
        min: 0,
        max: 1,
      },
    ]);
    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "multiselect",
        min: 1,
        max: 20,
        message:
          "Select controller chains, where token will be minted/burned (check README for more info)",
        choices: controllerChainOptions,
      },
    ]);

    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: controllerChainsInfo.controllerChains,
    };
  }
};

export const getProjectTokenListInfo = async (projectType: ProjectType) => {
  let tokenChoices = Object.keys(Tokens).map((token) => ({
    title: token,
    value: Tokens[token],
  }));

  if (projectType == ProjectType.SUPERBRIDGE) {
    return await prompts([
      {
        name: "tokens",
        type: "multiselect",
        message:
          "Select tokens to connect (the tokens we want to allow users to bridge to app chain)",
        min: 1,
        max: 20,
        choices: tokenChoices,
      },
    ]);
  } else if (projectType == ProjectType.SUPERTOKEN) {
    let tokenInfo = await prompts([
      {
        name: "token",
        type: "select",
        message:
          "Select supertoken to deploy (the token we want to move cross-chain)",
        choices: tokenChoices,
      },
    ]);
    return { tokens: [tokenInfo.token] };
  }
};

export const getHookRelatedInfo = async (
  isLimitsRequired: boolean,
  tokens: Tokens[]
) => {
  let tokenLimitInfo: TokenRateLimits = {};

  if (isLimitsRequired) {
    for (let token of tokens) {
      let limitInfo = await prompts([
        {
          name: "sendingLimit",
          type: "text",
          message: `Enter max daily sending limit for ${token} (Enter formatted values, 100.0 for 100 USDC. Check README for more info):`,
        },
        {
          name: "receivingLimit",
          type: "text",
          message: `Enter max daily receiving limit for ${token} (Enter formatted values, 100.0 for 100 USDC Check README for more info):`,
        },
      ]);

      tokenLimitInfo[token] = limitInfo;
    }
  }
  return { tokenLimitInfo };
};

export const buildProjectConstants = async (
  tokenInfo: { tokens: Tokens[] },
  chainsInfo: { vaultChains: ChainSlug[]; controllerChains: ChainSlug[] },
  hookType: Hooks,
  isLimitsRequired: boolean,
  tokenLimitInfo: TokenRateLimits,
  allChains: ChainSlug[]
) => {
  let projectConstants: ProjectConstants = {
    [DeploymentMode.PROD]: {},
  };

  for (const token of tokenInfo.tokens) {
    const limitsAndPoolId = {};
    for (const chain of allChains) {
      limitsAndPoolId[chain] = {
        [IntegrationTypes.fast]: tokenLimitInfo[token],
      };
    }
    projectConstants[DeploymentMode.PROD][token] = {
      vaultChains: chainsInfo.vaultChains,
      controllerChains: chainsInfo.controllerChains,
      hook: {
        hookType,
      },
    };
    if (isLimitsRequired) {
      projectConstants[DeploymentMode.PROD][token].hook.limitsAndPoolId =
        limitsAndPoolId;
    }
  }

  return projectConstants;
};
