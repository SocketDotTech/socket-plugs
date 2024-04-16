import fs from "fs";
import { ChainSlug, Hooks, ProjectConstants, ProjectType } from "../../../src";
import { enumFolderPath, serializeConstants } from "./configUtils";
import { Tokens } from "../../../src/enums";
import { ExistingTokenAddresses } from "../../../src/enums";

export const generateTokenAddressesFile = (
  chainSlug: ChainSlug,
  token: Tokens,
  tokenAddress: string,
  tokensEnum: object = Tokens
) => {
  if (!ExistingTokenAddresses[chainSlug])
    ExistingTokenAddresses[chainSlug] = {};
  ExistingTokenAddresses[chainSlug][token] = tokenAddress;
  console.log(ExistingTokenAddresses[chainSlug][token]);
  const serializedContent = serializeConstants(
    ExistingTokenAddresses,
    0,
    tokensEnum
  );
  console.log({ serializedContent });
  const content = `
  import { ChainSlug } from "@socket.tech/dl-core";
  import { Tokens } from "./tokens";
  
  export const ExistingTokenAddresses: {
    [key in ChainSlug]?: { [key in Tokens]?: string };
  } = {
    ${serializedContent}
};
`;
  console.log(content);
  fs.writeFileSync(enumFolderPath + "existing-token-addresses1.ts", content);
};
