import fs from "fs";
import { ChainSlug, Hooks, ProjectConstants, ProjectType } from "../../src";
import { enumFolderPath, serializeConstants } from "./configUtils";
import { Tokens } from "../../src/enums";
import { ExistingTokenAddresses } from "../../src/enums";

export type TokenAddressObj = {
  chainSlug: ChainSlug;
  token: Tokens | string;
  address: string;
};
export const generateTokenAddressesFile = (
  tokenAddresses: TokenAddressObj[],
  tokensEnum: object = Tokens
) => {
  for (const tokenAddressObj of tokenAddresses) {
    const { chainSlug, token, address } = tokenAddressObj;
    if (!ExistingTokenAddresses[chainSlug])
      ExistingTokenAddresses[chainSlug] = {};
    ExistingTokenAddresses[chainSlug][token] = address;
  }
  const serializedContent = serializeConstants(
    ExistingTokenAddresses,
    0,
    tokensEnum
  );
  const content = `
  import { ChainSlug } from "@socket.tech/dl-core";
  import { Tokens } from "./tokens";
  
  export const ExistingTokenAddresses: {
    [key in ChainSlug]?: { [key in Tokens]?: string };
  } = {
    ${serializedContent}
};
`;
  fs.writeFileSync(enumFolderPath + "existing-token-addresses.ts", content);
  console.log(
    `✔  existing token addresses file updated : ${
      enumFolderPath + "existing-token-addresses.ts"
    }`
  );
};
