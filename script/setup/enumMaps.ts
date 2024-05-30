import {
  ChainId,
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Project, Tokens } from "../../src/enums";
import { Hooks } from "../../src";

export const chainSlugReverseMap = createReverseEnumMap(ChainSlug);
export const chainIdReverseMap = createReverseEnumMap(ChainId);
export const tokensReverseMap = createReverseEnumMap(Tokens);
export const integrationTypesreverseMap =
  createReverseEnumMap(IntegrationTypes);
export const deploymentModeReverseMap = createReverseEnumMap(DeploymentMode);
export const hookReverseMap = createReverseEnumMap(Hooks);
export const projectReverseMap = createReverseEnumMap(Project);

// Function to create a reverse map from an enum
function createReverseEnumMap(enumObj: any) {
  const reverseMap = new Map<string, string>();
  for (const [key, value] of Object.entries(enumObj)) {
    reverseMap.set(String(value) as unknown as string, String(key));
  }
  return reverseMap;
}

export const getEnumMaps = (tokensEnum: object = Tokens) => {
  // tokens is calculating separately because it is updated during setupScript with new token
  const tokensMap = createReverseEnumMap(tokensEnum);
  return {
    chainSlugMap: chainSlugReverseMap,
    tokensMap,
    integrationTypesMap: integrationTypesreverseMap,
    deploymentModeMap: deploymentModeReverseMap,
    hookMap: hookReverseMap,
  };
};
