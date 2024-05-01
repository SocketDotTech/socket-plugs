import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { DeploymentMode } from "@socket.tech/dl-core";
import { Project, Tokens } from "../../src/enums";
import { ProjectType } from "../../src";
import { ProjectTypeMap } from "../../src/enums/projectType";
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

export const getMode = () => {
  return DeploymentMode.PROD;
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
  let tokens = process.env.TOKENS.split(",").map(
    (token) => token.trim() as Tokens
  );
  tokens.forEach((token) => {
    if (!Object.values(Tokens).includes(token as Tokens))
      throw new Error("TOKENS are invalid");
  });
  return tokens;
};

export const getDryRun = () => {
  if (!process.env.DRY_RUN) throw new Error("Dry run not mentioned");
  if (process.env.DRY_RUN !== "true" && process.env.DRY_RUN !== "false")
    throw new Error("Dry run is invalid, must be either 'true' or 'false'");
  return process.env.DRY_RUN === "true";
};

export const getConfigs = () => {
  let projectType = getProjectType();
  let projectName = getProjectName();
  let tokens = getTokens();
  let mode = getMode();
  let socketOwner = getOwner();
  return { projectType, projectName, tokens, mode, socketOwner };
};

export const printConfigs = () => {
  let { projectType, projectName, tokens, mode, socketOwner } = getConfigs();
  console.log("========================================================");
  console.log("PROJECT", projectName);
  console.log("PROJECT_TYPE", projectType);
  console.log("TOKENS", tokens);
  console.log(
    `Make sure ${mode}_${projectName}_addresses.json and ${mode}_${projectName}_verification.json is cleared for given networks if redeploying!!`
  );
  console.log(`Owner address configured to ${socketOwner}`);
  console.log("========================================================");
};
