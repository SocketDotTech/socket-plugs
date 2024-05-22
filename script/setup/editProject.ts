import prompts from "prompts";
import {
  Hooks,
  ProjectConstants,
  ProjectType,
  TokenConstants,
} from "../../src";
import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
  MainnetIds,
  TestnetIds,
} from "@socket.tech/dl-core";
import { Project, Tokens } from "../../src/enums";
import { generateConstantsFile } from "./generateConstants";

import { getConstantPathForProject } from "../helpers";
import { ProjectTypeMap } from "../../src/enums/projectType";
import { existsSync } from "fs";
import { chainSlugReverseMap } from "./enumMaps";
import { validateEmptyValue } from "./common";
var _ = require("lodash");

export const editProject = async () => {
  const projectChoices = Object.values(Project).map((project) => ({
    title: project,
    value: project,
  }));
  const projectInfo = await prompts([
    {
      name: "projectName",
      type: "select",
      message: "Select the project you want to edit",
      choices: projectChoices,
    },
  ]);
  const projectType = ProjectTypeMap[projectInfo.projectName] as ProjectType;
  let projectConstantsPath = getConstantPathForProject(
    projectInfo.projectName,
    projectType
  );

  if (!existsSync(projectConstantsPath + ".ts")) {
    console.log(
      `Project constants for ${projectInfo.projectName} not found at path ${projectConstantsPath}`
    );
    return;
  }
  let pc = require(projectConstantsPath).pc;

  const action = await prompts([
    {
      name: "action",
      type: "select",
      message: "Select the action you want to perform",
      choices: [
        {
          title: "Add Chain",
          value: "addChain",
        },
        {
          title: "Add Token",
          value: "addToken",
        },
        {
          title: "Update Rate Limits",
          value: "updateLimit",
        },
      ],
    },
  ]);

  if (action.action === "addChain") {
    await addChain(projectInfo.projectName, projectType, pc);
  } else if (action.action === "addToken") {
    await addToken(projectInfo.projectName, projectType, pc);
  } else if (action.action === "updateLimit") {
    await updateRateLimit(projectInfo.projectName, projectType, pc);
  }
};

export const addChain = async (
  projectName: string,
  projectType: ProjectType,
  pc: ProjectConstants
) => {
  let newPc: ProjectConstants = _.cloneDeep(pc);

  try {
    const projectTokens = Object.keys(pc[DeploymentMode.PROD]);
    const chains = new Set<ChainSlug>();

    for (const token of projectTokens) {
      const tokenConstants = pc[DeploymentMode.PROD][token] as TokenConstants;
      const allChains = [
        ...tokenConstants.vaultChains,
        ...tokenConstants.controllerChains,
      ];
      allChains.map((chain) => chains.add(chain));
    }

    let isTestnet = false;
    if (projectName.includes("testnet")) isTestnet = true;
    let possibleChains = isTestnet
      ? TestnetIds.filter((chain) => !chains.has(chain))
      : MainnetIds.filter((chain) => !chains.has(chain));

    const chainChoices = possibleChains.map((chain) => ({
      title: chainSlugReverseMap.get(String(chain)),
      value: chain,
    }));

    const chainInfo = await prompts([
      {
        name: "chain",
        type: "select",
        message: "Select the chain you want to add",
        choices: chainChoices,
      },
    ]);

    const tokenChoices = projectTokens.map((token) => ({
      title: token,
      value: token,
    }));
    const tokenInfo = await prompts([
      {
        name: "tokens",
        type: "multiselect",
        message: "Select the tokens where you want to add the new chain",
        choices: tokenChoices,
        min: 1,
      },
    ]);

    for (const token of tokenInfo.tokens) {
      const newChainSlug = chainInfo.chain;
      const currentTc = pc[DeploymentMode.PROD][token] as TokenConstants;
      const newTc = _.cloneDeep(currentTc);
      if (projectType === ProjectType.SUPERBRIDGE) {
        newTc.vaultChains.push(newChainSlug);
      } else if (projectType === ProjectType.SUPERTOKEN) {
        newTc.controllerChains.push(newChainSlug);
      }
      if (newTc?.hook?.limitsAndPoolId?.[newTc.vaultChains[0]])
        newTc.hook.limitsAndPoolId[newChainSlug] =
          newTc.hook.limitsAndPoolId[newTc.vaultChains[0]];
      newPc[DeploymentMode.PROD][token] = newTc;
    }
    generateConstantsFile(projectType, projectName, newPc);
  } catch (error) {
    console.log(error);
  }
};

export const addToken = async (
  projectName: string,
  projectType: ProjectType,
  pc: ProjectConstants
) => {
  let newPc: ProjectConstants = _.cloneDeep(pc);

  try {
    const projectTokens = Object.keys(pc[DeploymentMode.PROD]);
    const chains = new Set<ChainSlug>();

    for (const token of projectTokens) {
      const tokenConstants = pc[DeploymentMode.PROD][token] as TokenConstants;
      const allChains = [
        ...tokenConstants.vaultChains,
        ...tokenConstants.controllerChains,
      ];
      allChains.map((chain) => chains.add(chain));
    }

    let isTestnet = false;
    if (projectName.includes("testnet")) isTestnet = true;

    const allTokens = Object.values(Tokens);
    const possibleTokens = allTokens.filter(
      (token) => !projectTokens.includes(token)
    );
    const tokenChoices = possibleTokens.map((token) => ({
      title: token,
      value: token,
    }));

    const tokenInfo = await prompts([
      {
        name: "tokens",
        type: "multiselect",
        message:
          "Select the tokens which you want to add (If any token is not present in the list, please add it first using add new Token option)",
        choices: tokenChoices,
        min: 1,
      },
    ]);

    const copytTokenChoices = projectTokens.map((token) => ({
      title: token,
      value: token,
    }));
    const copyTokenInfo = await prompts([
      {
        name: "copyToken",
        type: "select",
        message:
          "Select the token from where you want to copy configuration (vault chains, controller chains, limits etc)",
        choices: copytTokenChoices,
      },
    ]);

    const copyTokenConfig = pc[DeploymentMode.PROD][
      copyTokenInfo.copyToken
    ] as TokenConstants;
    for (const token of tokenInfo.tokens) {
      newPc[DeploymentMode.PROD][token] = _.cloneDeep(copyTokenConfig);
    }
    generateConstantsFile(projectType, projectName, newPc);
  } catch (error) {
    console.log(error);
  }
};

export const updateRateLimit = async (
  projectName: string,
  projectType: ProjectType,
  pc: ProjectConstants
) => {
  let newPc: ProjectConstants = _.cloneDeep(pc);

  try {
    const projectTokens = Object.keys(pc[DeploymentMode.PROD]);
    const chains = new Set<ChainSlug>();

    for (const token of projectTokens) {
      const tokenConstants = pc[DeploymentMode.PROD][token] as TokenConstants;
      if (
        tokenConstants.hook.hookType != Hooks.LIMIT_HOOK &&
        tokenConstants.hook.hookType != Hooks.LIMIT_EXECUTION_HOOK
      ) {
        console.log(
          `Rate limits can only be updated for project with hook type LIMIT_HOOK or LIMIT_EXECUTION_HOOK. Returning ...`
        );
        return;
      }
      const allChains = [
        ...tokenConstants.vaultChains,
        ...tokenConstants.controllerChains,
      ];
      allChains.map((chain) => chains.add(chain));
    }

    let isTestnet = false;
    if (projectName.includes("testnet")) isTestnet = true;

    const tokenChoices = projectTokens.map((token) => ({
      title: token,
      value: token,
    }));

    const tokenInfo = await prompts([
      {
        name: "tokens",
        type: "multiselect",
        message: "Select the tokens for which you want to update rate limits",
        choices: tokenChoices,
        min: 1,
      },
    ]);

    const tokenChains = [...chains];
    const chainChoices = tokenChains.map((chain) => ({
      title: chainSlugReverseMap.get(String(chain)),
      value: chain,
    }));
    const chainInfo = await prompts([
      {
        name: "chains",
        type: "multiselect",
        message: "Select the chains for which you want to update rate limits",
        choices: chainChoices,
        min: 1,
      },
    ]);

    for (const token of tokenInfo.tokens) {
      const currentTc = pc[DeploymentMode.PROD][token] as TokenConstants;
      const newTc: TokenConstants = _.cloneDeep(currentTc);
      const currentTokenChains = Object.keys(newTc.hook.limitsAndPoolId).map(
        (c) => parseInt(c) as ChainSlug
      );
      console.log(`Updating rate limits for ${token}`);
      for (const chain of chainInfo.chains) {
        if (!currentTokenChains.includes(chain)) continue;

        const limitInfo = await prompts([
          {
            name: "sendingLimit",
            type: "text",
            message: `Enter max daily sending limit for ${token} on chain: ${chain} (Enter formatted values, 100.0 for 100 USDC. Check README for more info. prev value: ${
              newTc.hook.limitsAndPoolId[chain]?.[IntegrationTypes.fast]
                ?.sendingLimit
            } ${token}):`,
            validate: (value) => validateEmptyValue(value.trim()),
          },
          {
            name: "receivingLimit",
            type: "text",
            message: `Enter max daily receiving limit for ${token} on chain: ${chain} (Enter formatted values, 100.0 for 100 USDC Check README for more info. prev value: ${
              newTc.hook.limitsAndPoolId[chain]?.[IntegrationTypes.fast]
                ?.receivingLimit
            } ${token}):`,
            validate: (value) => validateEmptyValue(value.trim()),
          },
        ]);
        newTc.hook.limitsAndPoolId[chain][IntegrationTypes.fast] = {
          ...newTc.hook.limitsAndPoolId[chain][IntegrationTypes.fast], // to preserve poolId values
          sendingLimit: limitInfo.sendingLimit,
          receivingLimit: limitInfo.receivingLimit,
        };
      }
      newPc[DeploymentMode.PROD][token] = newTc;
    }
    generateConstantsFile(projectType, projectName, newPc);
  } catch (error) {
    console.log(error);
  }
};
