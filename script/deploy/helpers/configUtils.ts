import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { ChainId, ChainSlug } from "@socket.tech/dl-core";
import { Project, Tokens } from "../../../src/enums";
import {
  chainSlugMap,
  deploymentModeMap,
  getEnumMaps,
  hookMap,
  integrationTypesMap,
  tokensMap,
} from "./enumMaps";
import { ProjectType } from "../../../src";
import { rpcKeys } from "../../../src/enums/rpcKeys";

export const enumFolderPath = path.join(__dirname, `/../../../src/enums/`);

export const buildEnvFile = async (
  projectName: string,
  projectType: ProjectType,
  ownerAddress: string,
  tokens: Tokens[],
  chains: ChainSlug[]
) => {
  let configsString = `\nPROJECT="${projectName}"\nPROJECT_TYPE="${projectType}"\nTOKENS="${tokens.join(
    ","
  )}"\nOWNER_ADDRESS=${ownerAddress}\nOWNER_SIGNER_KEY=""\nDRY_RUN=""\n`;

  for (let chain of chains) {
    let chainRpcKey = rpcKeys[chain];
    configsString = configsString + `${chainRpcKey}=""\n`;
  }

  await writeFile(".env", configsString);
  console.log("Created env");
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
      `,\n  [Tokens.${symbol.toUpperCase()}]: "${symbol}",\n};\n`,
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
      console.log({ newChain, chainName });
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

  const verificationDetailsString = fs.readFileSync(filePath, "utf-8");

  // replace last bracket with new line
  const verificationDetails = verificationDetailsString
    .trimEnd()
    .replace(replaceWith, newChainDetails);

  fs.writeFileSync(filePath, verificationDetails);
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
