import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { DeploymentMode } from "@socket.tech/dl-core";
import { Project, ProjectType, Tokens } from "../../src";

export const getSocketOwner = () => {
  if (!process.env.SOCKET_OWNER_ADDRESS)
    throw Error("Socket owner address not present");
  return process.env.SOCKET_OWNER_ADDRESS;
};

export const getSocketSignerKey = () => {
  if (!process.env.SOCKET_SIGNER_KEY)
    throw Error("Socket signer key not present");
  return process.env.SOCKET_SIGNER_KEY;
};

export const getMode = () => {
  if (!process.env.DEPLOYMENT_MODE)
    throw new Error("DeploymentMode not mentioned");
  if (
    !Object.values(DeploymentMode).includes(
      process.env.DEPLOYMENT_MODE as DeploymentMode
    )
  )
    throw new Error("DeploymentMode is invalid");
  return process.env.DEPLOYMENT_MODE as DeploymentMode;
};

export const getSuperBridgeProject = () => {
  if (!process.env.PROJECT) throw new Error("Project not mentioned");
  if (!Object.values(Project).includes(process.env.PROJECT as Project))
    throw new Error("Project is invalid");
  return process.env.PROJECT as Project;
};

export const getProjectType = () => {
  if (!process.env.PROJECT_TYPE) throw new Error("PROJECT_TYPE not mentioned");
  if (
    !Object.values(ProjectType).includes(
      process.env.PROJECT_TYPE as ProjectType
    )
  )
    throw new Error("project is invalid");
  return process.env.PROJECT_TYPE as ProjectType;
};

export const isSuperBridge = () => getProjectType() === ProjectType.SUPERBRIDGE;
export const isSuperToken = () => getProjectType() === ProjectType.SUPERTOKEN;

export const getToken = () => {
  if (!process.env.TOKEN) throw new Error("Token not mentioned");
  if (!Object.values(Tokens).includes(process.env.TOKEN as Tokens))
    throw new Error("Token is invalid");
  return process.env.TOKEN as Tokens;
};

export const getProjectName = () => {
  const projectType = getProjectType();
  if (projectType === ProjectType.SUPERBRIDGE) return getSuperBridgeProject();
  if (projectType === ProjectType.SUPERTOKEN) return getTokenProject();
};

export const getTokenProject = () => {
  if (!process.env.TOKEN_PROJECT)
    throw new Error("Token project not mentioned");
  return process.env.TOKEN_PROJECT as Project;
};

export const getDryRun = () => {
  if (!process.env.DRY_RUN) throw new Error("Dry run not mentioned");
  if (process.env.DRY_RUN !== "true" && process.env.DRY_RUN !== "false")
    throw new Error("Dry run is invalid, must be either 'true' or 'false'");
  return process.env.DRY_RUN === "true";
};
