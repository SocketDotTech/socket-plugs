import path from "path";
import fs, { appendFile, appendFileSync, writeFileSync } from "fs";
import { writeFile } from "fs/promises";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import {
  chainSlugReverseMap,
  getEnumMaps,
  projectReverseMap,
} from "./enumMaps";
import { ProjectType } from "../../src";
import { NewTokenInfo } from "./common";
import { getChainName } from "../constants";

export const enumFolderPath = path.join(__dirname, `/../../src/enums/`);
export const envFolderPath = path.join(__dirname, `/../../`);

export const buildEnvFile = async (
  projectName: string,
  projectType: ProjectType,
  ownerAddress: string,
  tokens: Tokens[],
  chains: ChainSlug[]
) => {
  let { publicEnvData, privateEnvData } = getProjectEnvData(
    projectName,
    projectType,
    ownerAddress,
    tokens,
    chains
  );
  let finalEnvData: Record<string, string>;

  let envFileExists = fs.existsSync(".env");
  if (envFileExists) {
    const envFileData = parseEnvFile(".env");
    writeFileSync(envFolderPath + ".envbackup", objectToEnv(envFileData));
    console.log(`✔  Backup of existing .env file created`);
    // replace the existing values with the new values for public data
    const updatedPublicEnvData = { ...envFileData, ...publicEnvData };
    // merge the private data. if a key is already present in the env file, it will not be overwritten
    finalEnvData = { ...privateEnvData, ...updatedPublicEnvData };
  } else {
    finalEnvData = { ...privateEnvData, ...publicEnvData };
  }
  await writeFile(envFolderPath + ".env", objectToEnv(finalEnvData));
  console.log(`✔  Generated .env file`);
};

export const appendToEnvFile = (
  variableName: string,
  variableValue: string
) => {
  const envString = `${variableName}=${variableValue}\n`;
  appendFileSync(envFolderPath + ".env", envString);
  console.log(`✔  Updated .env file, added ${variableName} to .env`);
};

export const getProjectEnvData = (
  projectName: string,
  projectType: ProjectType,
  ownerAddress: string,
  tokens: Tokens[],
  chains: ChainSlug[]
) => {
  let publicEnvData: Record<string, string> = {
    PROJECT: projectName,
    TOKENS: tokens.join(","),
    OWNER_ADDRESS: ownerAddress,
    DRY_RUN: "false",
  };
  let privateEnvData: Record<string, string> = {
    OWNER_SIGNER_KEY: "",
  };
  if (chains.includes(ChainSlug.ARBITRUM)) {
    privateEnvData.ARBISCAN_API_KEY = "";
  }
  if (chains.includes(ChainSlug.BSC)) {
    privateEnvData.BSCSCAN_API_KEY = "";
  }
  if (chains.includes(ChainSlug.MAINNET)) {
    privateEnvData.ETHERSCAN_API_KEY = "";
  }
  if (chains.includes(ChainSlug.OPTIMISM)) {
    privateEnvData.OPTIMISM_API_KEY = "";
  }
  if (chains.includes(ChainSlug.POLYGON_MAINNET)) {
    privateEnvData.POLYGONSCAN_API_KEY = "";
  }
  if (chains.includes(ChainSlug.BASE)) {
    privateEnvData.BASESCAN_API_KEY = "";
  }

  for (let chain of chains) {
    let chainName = getChainName(chain);
    privateEnvData[`${chainName}_RPC`] = "";
  }

  return { publicEnvData, privateEnvData };
};

export const updateProjectEnums = async (
  projectName: string,
  projectType: ProjectType
) => {
  await updateFile(
    "projects.ts",
    `,\n  ${projectName.toUpperCase()} = "${projectName.toLowerCase()}",\n}\n`,
    ",\n}"
  );

  await updateFile(
    "projectType.ts",
    `,\n  [Project.${projectName.toUpperCase()}]: ${
      projectType == ProjectType.SUPERBRIDGE
        ? "ProjectType.SUPERBRIDGE"
        : "ProjectType.SUPERTOKEN"
    },\n};\n`,
    ",\n};"
  );
};

export const updateTokenEnums = async (newTokenInfo: {
  name: string;
  symbol: string;
  decimals: number;
}) => {
  if (!newTokenInfo.name) return;

  let { name, symbol, decimals } = newTokenInfo;
  await updateFile(
    "tokens.ts",
    `,\n  ${symbol.toUpperCase()} = "${symbol.toUpperCase()}",\n}\n`,
    ",\n}"
  );

  await updateFile(
    "tokenName.ts",
    `,\n  [Tokens.${symbol.toUpperCase()}]: "${name}",\n};\n`,
    ",\n};"
  );
  await updateFile(
    "tokenSymbol.ts",
    `,\n  [Tokens.${symbol.toUpperCase()}]: "${symbol.toUpperCase()}",\n};\n`,
    ",\n};"
  );

  await updateFile(
    "tokenDecimals.ts",
    `,\n  [Tokens.${symbol.toUpperCase()}]: ${decimals},\n};\n`,
    ",\n};"
  );

  console.log(`✔  Updated Enums : Tokens, Symbols, Decimals, Token Names`);
};

const updateFile = async (fileName, newChainDetails, replaceWith) => {
  const filePath = enumFolderPath + fileName;
  const outputExists = fs.existsSync(filePath);
  if (!outputExists) throw new Error(`${fileName} enum not found! ${filePath}`);

  const fileDataString = fs.readFileSync(filePath, "utf-8");

  // replace last bracket with new line
  const newDataString = fileDataString
    .trimEnd()
    .replace(replaceWith, newChainDetails);

  fs.writeFileSync(filePath, newDataString);
};

const checkValueIfEnum = (value: any, tokensEnum: object = Tokens) => {
  const {
    chainSlugMap,
    tokensMap,
    integrationTypesMap,
    deploymentModeMap,
    hookMap,
  } = getEnumMaps(tokensEnum);
  if (chainSlugMap.has(value)) {
    return "ChainSlug." + chainSlugMap.get(value);
  } else if (tokensMap.has(value)) {
    return "Tokens." + tokensMap.get(value);
  } else if (integrationTypesMap.has(value)) {
    return "IntegrationTypes." + integrationTypesMap.get(value);
  } else if (deploymentModeMap.has(value)) {
    return "DeploymentMode." + deploymentModeMap.get(value);
  } else if (hookMap.has(value)) {
    return "Hooks." + hookMap.get(value);
  }
  return null;
};

export const serializeConstants = (
  constants: any,
  depth: number = 0,
  tokensEnum: object = Tokens
): string => {
  const indent = " ".repeat(depth * 2); // Increase indent by 2 spaces per depth level
  const entries = Object.entries(constants);

  const serializedEntries = entries.map(([key, value]) => {
    const enumKey = checkValueIfEnum(key, tokensEnum);
    const newKey = enumKey ? `[${enumKey}]` : String(key);

    if (typeof value === "object" && !Array.isArray(value) && value !== null) {
      return `${indent}${newKey}: {\n${serializeConstants(
        value,
        depth + 1,
        tokensEnum
      )}\n${indent}}`;
    } else if (Array.isArray(value)) {
      return `${indent}${newKey}: [${value
        .map((v) => {
          const enumValue = checkValueIfEnum(String(v), tokensEnum);
          return enumValue ? `${enumValue}` : JSON.stringify(v);
        })
        .join(", ")}]`;
    } else {
      let valueEnum = checkValueIfEnum(String(value), tokensEnum);
      let newValue = valueEnum ? valueEnum : JSON.stringify(value);
      // Currently we don't have chain slugs as values, so can avoid them for now. This is a fix
      // for the case when we have chain slugs as values, for example sendingLimit = 1.
      newValue = newValue.includes("ChainSlug.")
        ? JSON.stringify(value)
        : newValue;

      return `${indent}${newKey}: ${newValue}`;
    }
  });

  return serializedEntries.join(",\n");
};

export const objectToEnv = (env: { [key: string]: string }) => {
  return Object.entries(env)
    .map(([key, value]) => {
      return `${key} = "${value}"`;
    })
    .join("\n");
};

export const parseEnvFile = (filePath) => {
  try {
    // Read the file content
    const content = fs.readFileSync(filePath, { encoding: "utf-8" });
    const envObject = {};

    // Split content into lines
    content.split(/\r?\n/).forEach((line) => {
      // Remove leading and trailing whitespaces
      line = line.trim();

      // Ignore empty lines and lines starting with `#` (comments)
      if (line !== "" && !line.startsWith("#")) {
        // Split the line into key and value by the first `=`
        let [key, ...value] = line.split("=");
        key = key.trim();
        let finalValue = value.join("=").trim(); // Join back the value in case it contains `=`
        if (
          (finalValue.startsWith('"') && finalValue.endsWith('"')) ||
          (finalValue.startsWith("'") && finalValue.endsWith("'"))
        ) {
          finalValue = finalValue.substring(1, finalValue.length - 1);
        }
        // Only add to the object if the key is not empty
        if (key) {
          envObject[key] = finalValue;
        }
      }
    });

    return envObject;
  } catch (error) {
    console.error("Failed to read the .env file:", error);
    return {};
  }
};
