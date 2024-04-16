import fs from "fs";
import { Hooks, ProjectConstants, ProjectType } from "../../../src";
import {
  chainSlugMap,
  deploymentModeMap,
  hookMap,
  integrationTypesMap,
  tokensMap,
} from "./enumMaps";
import path from "path";
import { serializeConstants } from "./configUtils";
import { Project, Tokens } from "../../../src/enums";

export const generateConstantsFile = (
  projectType: ProjectType,
  projectName: string,
  projectConstants: ProjectConstants,
  tokensEnum: object = Tokens
) => {
  let filePath = path.join(
    __dirname,
    `/../../constants/projectConstants/${projectType}/${projectName}.ts`
  );

  const content = `
import {
    ChainSlug,
    DeploymentMode,
    IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

const pc: ProjectConstants = {
    ${serializeConstants(projectConstants, 0, tokensEnum)}
};

export = pc;
`;
  console.log(content);
  fs.writeFileSync(filePath, content);
};
