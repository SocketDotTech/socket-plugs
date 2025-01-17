import { config as dotenvConfig } from "dotenv";
import { DeploymentMode } from "@socket.tech/dl-core";
import { NFTs, Project, Tokens } from "../../src/enums";
import { ProjectType, TokenType } from "../../src";
import { ProjectTypeMap } from "../../src/enums/projectType";
import { ProdTestnetProjects } from "../../src/enums/prodTestnetProjects";

dotenvConfig();

// import { Project, ProjectType, Tokens } from "../../src";

export const getOwner = () => {
  if (!process.env.OWNER_ADDRESS)
    throw Error("Socket owner address not present");
  return process.env.OWNER_ADDRESS;
};

export const getOwnerSignerKey = () => {
  if (!process.env.OWNER_SIGNER_KEY)
    throw Error("Owner signer key not present");
  return process.env.OWNER_SIGNER_KEY;
};

let deploymentMode: DeploymentMode;
// use prod as default if not mentioned
export const getMode = () => {
  if (deploymentMode) return deploymentMode;

  // If deployment Mode set in env, give it preference
  if (process.env.DEPLOYMENT_MODE) {
    deploymentMode = process.env.DEPLOYMENT_MODE as DeploymentMode;
    return deploymentMode;
  }

  const projectName = process.env.PROJECT;
  // project name wont be present if user is running new project script. return as it is, will be undefined. it is handled in projectInfo script,
  // where it is set to surge or prod based on project is mainnet or testnet
  if (!projectName) return deploymentMode;

  // If project is testnet and not in ProdTestnetProjects, set deployment mode to surge, else prod
  if (
    projectName.includes("testnet") &&
    !ProdTestnetProjects.includes(projectName as Project)
  ) {
    deploymentMode = DeploymentMode.SURGE;
  } else {
    deploymentMode = DeploymentMode.PROD;
  }
  return deploymentMode;
};

export const setMode = (mode: DeploymentMode) => {
  deploymentMode = mode;
};

export const getProjectName = () => {
  if (!process.env.PROJECT) throw new Error("Project not mentioned");
  if (!Object.values(Project).includes(process.env.PROJECT as Project))
    throw new Error("Project is invalid");
  return process.env.PROJECT as Project;
};

export const getProjectType = () => {
  const projectType = ProjectTypeMap[getProjectName()];
  if (!projectType)
    throw new Error(
      "Project type not found, please check src/enums/projectType.ts"
    );
  return projectType;
};

export const isSuperBridge = () => getProjectType() === ProjectType.SUPERBRIDGE;
export const isSuperToken = () => getProjectType() === ProjectType.SUPERTOKEN;

export const getTokens = () => {
  if (!process.env.TOKENS) throw new Error("TOKENS not mentioned");
  let tokens = process.env.TOKENS.split(",").map((token) => token.trim());
  tokens.forEach((token) => {
    if (
      !Object.values(Tokens).includes(token as Tokens) &&
      !Object.values(NFTs).includes(token as NFTs)
    )
      throw new Error("TOKENS are invalid");
  });
  return tokens;
};

export const getTokenTypes = () => {
  if (!process.env.TOKEN_TYPES) throw new Error("TOKEN_TYPES not mentioned");
  return process.env.TOKEN_TYPES.split(",").map(
    (tokenType) => tokenType.trim() as TokenType
  );
};

export const getDryRun = () => {
  if (!process.env.DRY_RUN) return false;
  if (process.env.DRY_RUN !== "true" && process.env.DRY_RUN !== "false")
    return false;
  return process.env.DRY_RUN === "true";
};

export const getConfigs = () => {
  let projectType = getProjectType();
  let projectName = getProjectName();
  let tokens = getTokens();
  let tokenTypes = getTokenTypes();
  let mode = getMode();
  let socketOwner = getOwner();
  return { projectType, projectName, tokens, tokenTypes, mode, socketOwner };
};

export const printConfigs = () => {
  let { projectType, projectName, tokens, tokenTypes, mode, socketOwner } =
    getConfigs();
  console.log("========================================================");
  console.log("PROJECT", projectName);
  console.log("PROJECT_TYPE", projectType);
  console.log("TOKENS", tokens);
  console.log("TOKEN_TYPES", tokenTypes);
  console.log("MODE", mode);
  console.log(
    `Make sure ${mode}_${projectName}_addresses.json and ${mode}_${projectName}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${socketOwner}`);
  console.log("========================================================");
};
