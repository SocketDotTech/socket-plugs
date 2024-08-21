import prompts from "prompts";
import { DeploymentMode, Hooks, ProjectType } from "../../../src";
import {
  getChainName,
  getMainnetIds,
  getTestnetIds,
  initDeploymentConfig,
} from "../../constants/deploymentConfig";
import { ProjectConfig, validateEthereumAddress } from "../common";
import { getMode, setMode } from "../../constants";

export const getProjectInfo = async () => {
  const currentOwnerAddress = process.env.OWNER_ADDRESS;
  const projectInfo: ProjectConfig = await prompts([
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

  if (projectInfo.isMainnet) {
    setMode(DeploymentMode.PROD);
  } else {
    setMode(DeploymentMode.SURGE);
  }
  await initDeploymentConfig();
  projectInfo.projectName = getProjectName(
    projectInfo.projectName,
    projectInfo.isMainnet
  );
  projectInfo.owner = projectInfo.owner.trim();
  const isLimitsRequired =
    projectInfo.hookType === Hooks.LIMIT_HOOK ||
    projectInfo.hookType === Hooks.LIMIT_EXECUTION_HOOK;
  const possibleChains = projectInfo.isMainnet
    ? getMainnetIds()
    : getTestnetIds();
  const chainOptions = possibleChains.map((chain) => ({
    title: getChainName(chain),
    value: chain,
  }));
  return { ...projectInfo, isLimitsRequired, chainOptions };
};

export const getProjectName = (projectName: string, isMainnet: boolean) => {
  const newProjectName = projectName
    .toLowerCase()
    .trim()
    .replace(/[\s-]/g, "_"); // convert to lowercase, replace all space and - with _
  return isMainnet ? newProjectName + "_mainnet" : newProjectName + "_testnet";
};
