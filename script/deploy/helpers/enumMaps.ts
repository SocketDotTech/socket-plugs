import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src/enums";
import { Hooks } from "../../../src";

export const chainSlugMap = createReverseEnumMap(ChainSlug);
export const tokensMap = createReverseEnumMap(Tokens);
export const integrationTypesMap = createReverseEnumMap(IntegrationTypes);
export const deploymentModeMap = createReverseEnumMap(DeploymentMode);
export const hookMap = createReverseEnumMap(Hooks);

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
    chainSlugMap,
    tokensMap,
    integrationTypesMap,
    deploymentModeMap,
    hookMap,
  };
};
