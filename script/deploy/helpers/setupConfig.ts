import { utils } from "ethers";
import prompts from "prompts";
import { updateEnums, buildEnvFile } from "./configUtils";
import { Hooks, ProjectConstants, ProjectType } from "../../../src";
import {
  ChainSlug,
  ChainSlugToKey,
  DeploymentMode,
  IntegrationTypes,
  MainnetIds,
  TestnetIds,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src/enums";
import { generateConstantsFile } from "./generateConstants";
import { generateTokenAddressesFile } from "./updateExistingTokenAddresses";

export async function setupConfigs() {
  const projectConfig: {
    projectType: ProjectType;
    projectName: string;
    hookType: Hooks;
    owner: string;
    isMainnet: boolean;
    newToken: boolean;
  } = await prompts([
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
        "Enter project name (without spaces, use underscore instead of spaces, eg: socket_testnet)",
    },
    {
      name: "owner",
      type: "text",
      message:
        "Enter owner Address * (Owner will be the deployer initially to configure roles)",
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
    {
      name: "newToken",
      type: "toggle",
      message:
        "Want to add a new token? (select yes if you have an already deployed token)",
      active: "yes",
      inactive: "no",
    },
  ]);
  let { projectName, projectType, owner, hookType, isMainnet, newToken } =
    projectConfig;
  owner = owner.trim();
  let isLimitsRequired =
    hookType === Hooks.LIMIT_HOOK || hookType === Hooks.LIMIT_EXECUTION_HOOK;
  let possibleChains = projectConfig.isMainnet ? MainnetIds : TestnetIds;
  let chainOptions = possibleChains.map((chain) => ({
    title: ChainSlugToKey[chain.toString()],
    value: chain,
  }));
  let newTokenInfo: {
    name: string;
    symbol: string;
    decimals: number;
    chainSlug: ChainSlug;
    address: string;
  } = {
    name: "",
    symbol: "",
    decimals: 0,
    address: "",
    chainSlug: 0 as ChainSlug,
  };
  if (projectConfig.newToken) {
    newTokenInfo = await prompts([
      {
        name: "name",
        type: "text",
        message: "Enter token name",
      },
      {
        name: "symbol",
        type: "text",
        message: "Enter token symbol",
      },
      {
        name: "decimals",
        type: "number",
        message: "Enter token decimals",
      },

      {
        name: "chainSlug",
        type: "select",
        message: "Select chain where token is deployed",
        choices: chainOptions,
      },

      {
        name: "address",
        type: "text",
        message: "Enter token address",
        validate: (value) => validateEthereumAddress(value.trim()),
      },
    ]);
    newTokenInfo.symbol = newTokenInfo.symbol.toUpperCase();
    newTokenInfo.address = newTokenInfo.address.trim();
  }

  let chainsInfo = await prompts([
    {
      name: "vaultChains",
      type: "multiselect",
      message: "Select vault chains (check README for more info)",
      choices: chainOptions,
      validate: (value) => validateVaultChains(projectType, value),
    },
    {
      name: "controllerChains",
      type: "multiselect",
      message: "Select controller chains (check README for more info)",
      choices: chainOptions,
      validate: (value) => validateControllerChains(projectType, value),
    },
  ]);

  const allChains = [...chainsInfo.vaultChains, ...chainsInfo.controllerChains];
  await updateEnums(projectConfig.projectName, newTokenInfo);
  console.log(
    `✔  Updated Enums : Tokens, RPC Keys, Symbols, Decimals, Token Names`
  );

  let tokenChoices = Object.keys(Tokens).map((token) => ({
    title: token,
    value: Tokens[token],
  }));
  if (projectConfig.newToken) {
    tokenChoices.push({
      title: newTokenInfo.symbol.toUpperCase(),
      value: newTokenInfo.symbol.toUpperCase(),
    });
  }

  let tokenInfo: {
    tokens: Tokens[];
  } = await prompts([
    {
      name: "tokens",
      type: "multiselect",
      message: "Select tokens to connect",
      choices: tokenChoices,
      validate: (value) => validateTokens(projectType, value),
    },
  ]);

  await buildEnvFile(
    projectConfig.projectName,
    projectConfig.projectType,
    projectConfig.owner,
    tokenInfo.tokens,
    allChains
  );
  const limitInfos: {
    [token: string]: { sendingLimit: number; receivingLimit: number };
  } = {};
  if (isLimitsRequired) {
    for (let token of tokenInfo.tokens) {
      let limitInfo = await prompts([
        {
          name: "sendingLimit",
          type: "text",
          message: `Enter sending limit for ${token}`,
        },
        {
          name: "receivingLimit",
          type: "text",
          message: `Enter receiving limit for ${token}`,
        },
      ]);

      limitInfos[token] = limitInfo;
    }
  }
  let projectConstants: ProjectConstants = {
    [DeploymentMode.PROD]: {},
  };

  for (const token of tokenInfo.tokens) {
    const limitsAndPoolId = {};
    for (const chain of allChains) {
      limitsAndPoolId[chain] = {
        [IntegrationTypes.fast]: limitInfos[token],
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
  const newTokensEnum = {
    ...Tokens,
    [newTokenInfo.symbol.toUpperCase()]: newTokenInfo.symbol.toUpperCase(),
  };
  generateConstantsFile(
    projectType,
    projectName,
    projectConstants,
    newTokensEnum
  );
  if (newTokenInfo.symbol) {
    generateTokenAddressesFile(
      newTokenInfo.chainSlug,
      newTokenInfo.symbol.toUpperCase() as Tokens,
      newTokenInfo.address,
      newTokensEnum
    );
  }
}

setupConfigs();

export const validateEthereumAddress = (address: string) => {
  return utils.isAddress(address);
};

export const validateVaultChains = (
  projectType: ProjectType,
  vaultChains: ChainSlug[]
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    return vaultChains.length >= 1;
  } else if (projectType == ProjectType.SUPERTOKEN) {
    return vaultChains.length <= 1;
  } else {
    return false;
  }
};

export const validateControllerChains = (
  projectType: ProjectType,
  controllerChains: ChainSlug[]
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    return controllerChains.length == 1;
  } else if (projectType == ProjectType.SUPERTOKEN) {
    return controllerChains.length >= 1;
  } else {
    return false;
  }
};

export const validateTokens = (projectType: ProjectType, tokens: Tokens[]) => {
  if (projectType == ProjectType.SUPERTOKEN) {
    return tokens.length == 1;
  }
  return true;
};
