import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../../src/enums";
import { chainSlugMap, getEnumMaps } from "./enumMaps";
import { ProjectType } from "../../../src";

export const enumFolderPath = path.join(__dirname, `/../../../src/enums/`);

export const buildEnvFile = async (
  projectName: string,
  projectType: ProjectType,
  ownerAddress: string,
  tokens: Tokens[],
  chains: ChainSlug[]
) => {
  let envData = {
    PROJECT: projectName,
    PROJECT_TYPE: projectType,
    TOKENS: tokens.join(","),
    OWNER_ADDRESS: ownerAddress,
    OWNER_SIGNER_KEY: "",
    DRY_RUN: "false",
    ARBISCAN_API_KEY: "",
    BSCSCAN_API_KEY: "",
    ETHERSCAN_API_KEY: "",
    OPTIMISM_API_KEY: "",
    POLYGONSCAN_API_KEY: "",
    BASESCAN_API_KEY: "",
  };

  let envFileExists = fs.existsSync(".env");
  if (envFileExists) {
    const envFileData = parseEnvFile(".env");
    envData = { ...envFileData, ...envData };
  }

  for (let chain of chains) {
    let chainName = chainSlugMap.get(String(chain));
    envData[`${chainName}_RPC`] = "";
  }
  await writeFile(".env", objectToEnv(envData));
  console.log(`✔  Generated .env file`);
};

export const updateEnums = async (
  projectName: string,
  newTokenInfo: {
    name: string;
    symbol: string;
    decimals: number;
    chainSlug: ChainSlug;
    address: string;
  },
  newChains: ChainSlug[]
) => {
  if (!fs.existsSync(enumFolderPath)) {
    throw new Error(`Folder not found! ${enumFolderPath}`);
  }

  await updateFile(
    "projects.ts",
    `,\n  ${projectName.toUpperCase()} = "${projectName.toLowerCase()}",\n}\n`,
    ",\n}"
  );
  if (newTokenInfo.name) {
    let { name, symbol, decimals, chainSlug, address } = newTokenInfo;
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
  }

  if (newChains.length) {
    for (let newChain of newChains) {
      let chainName = chainSlugMap.get(String(newChain));
      await updateFile(
        "rpcKeys.ts",
        `,\n  [ChainSlug.${chainName.toUpperCase()}] : "${chainName.toUpperCase()}_RPC",\n};\n`,
        ",\n};"
      );
    }
  }
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
    const newKey = enumKey ? `[${enumKey}]` : key;

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
        if ((finalValue.startsWith('"') && finalValue.endsWith('"')) || (finalValue.startsWith("'") && finalValue.endsWith("'"))){
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
}
