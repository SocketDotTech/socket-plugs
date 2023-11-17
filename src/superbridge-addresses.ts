import { DeploymentMode } from "@socket.tech/dl-core";
import { Project, ProjectAddresses } from "./types";

export const getSuperbridgeAddresses = async (
  mode: DeploymentMode,
  project: Project
): Promise<ProjectAddresses> => {
  try {
    // path relative to its position in final published package
    return (await import(
      `../deployments/superbridge/${mode}_${project}_addresses.json`
    )) as ProjectAddresses;
  } catch (e) {
    throw new Error(`addresses not found, mode: ${mode}, project: ${project}`);
  }
};
