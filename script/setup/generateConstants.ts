import fs from "fs";
import { ProjectConstants, ProjectType } from "../../src";
import path from "path";
import { serializeConstants } from "./configUtils";
import { Tokens } from "../../src/enums";

export const generateConstantsFile = (
  projectType: ProjectType,
  projectName: string,
  projectConstants: ProjectConstants,
  tokensEnum: object = Tokens
) => {
  let filePath = path.join(
    __dirname,
    `/../constants/projectConstants/${projectType}/${projectName}.ts`
  );

  const content = `
import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

// For testnet deployments, ChainSlug enum may not have some chains, therefore some keys will look like {421614:{}} instead of {[ChainSlug.ARBITRUM_SEPOLIA]:{}}. This wont affect the functionality of the project.
export const pc: ProjectConstants = {
${serializeConstants(projectConstants, 1, tokensEnum)}
};
`;
  fs.writeFileSync(filePath, content);
  console.log(`✔  Project Constants file generated : ${filePath}`);
};
