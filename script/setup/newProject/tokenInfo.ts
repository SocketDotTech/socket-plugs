import { ChainSlug } from "@socket.tech/dl-core";
import prompts from "prompts";
import { ProjectType } from "../../../src";
import { ExistingTokenAddresses, Tokens } from "../../../src/enums";
import { validateEmptyValue, validateEthereumAddress } from "../common";
import { updateTokenEnums } from "../configUtils";
import { chainSlugReverseMap } from "../enumMaps";
import { generateTokenAddressesFile } from "../updateExistingTokenAddresses";
import { SuperTokenInfo, tokenEnum, TokenInfo } from "./main";
import { getChainName } from "../../constants";

export const getProjectTokenListInfo = async (
  projectType: ProjectType,
  ownerAddress: string,
  vaultChains: ChainSlug[],
  controllerChains: ChainSlug[]
): Promise<TokenInfo> => {
  const tokenChoices = Object.keys(tokenEnum).map((token) => ({
    title: token,
    value: tokenEnum[token],
  }));
  if (projectType == ProjectType.SUPERBRIDGE) {
    const response = await prompts([
      {
        name: "tokens",
        type: "multiselect",
        message:
          "Select tokens to connect (the tokens we want to allow users to bridge to app chain)",
        min: 1,
        max: 20,
        choices: tokenChoices,
      },
    ]);
    const tokens = response.tokens as Tokens[];
    const mergeInboundWithTokens = await getMergeInboundWithTokens(tokens);
    const tokenAddresses = await getSuperbridgeMissingTokenAddresses(tokens, [
      ...vaultChains,
      ...controllerChains,
    ]);

    return { tokens, mergeInboundWithTokens, tokenAddresses };
  } else if (projectType === ProjectType.SUPERTOKEN) {
    const allTokens: Tokens[] = [];
    const superTokenInfoMap: Record<string, SuperTokenInfo> = {};
    console.log("provide Supertoken details : ");
    while (true) {
      const supertokenInfo = await getSuperTokenInfo(
        ownerAddress,
        vaultChains,
        controllerChains
      );
      const token = supertokenInfo.symbol;
      if (!(token in tokenEnum)) {
        await updateTokenEnums(supertokenInfo);
        tokenEnum[token] = token;
      }
      if (supertokenInfo.currentAddresses.length > 0)
        generateTokenAddressesFile(supertokenInfo.currentAddresses, tokenEnum);

      allTokens.push(token as Tokens);
      superTokenInfoMap[token] = supertokenInfo;
      const response = await prompts([
        {
          name: "addMoreTokens",
          type: "confirm",
          message: "Want to add more tokens?",
        },
      ]);
      if (!response.addMoreTokens) break;
    }
    return { tokens: allTokens, superTokenInfoMap };
  }
};

export const getSuperTokenInfo = async (
  ownerAddress: string,
  vaultChains: ChainSlug[],
  controllerChains: ChainSlug[]
) => {
  const isFreshDeployment = vaultChains.length === 0;
  let superTokenInfo: SuperTokenInfo = {
    name: "",
    symbol: "",
    decimals: 0,
    owner: ownerAddress,
    initialSupplyOwner: ownerAddress,
    initialSupply: "0",
    currentAddresses: [],
  };

  const info = await prompts([
    {
      name: "name",
      type: "text",
      message: `Enter token name: `,
      validate: (value) => validateEmptyValue(String(value).trim()),
    },
    {
      name: "symbol",
      type: "text",
      message: `Enter token symbol:`,
      validate: (value) => validateEmptyValue(String(value).trim()),
    },
    {
      name: "decimals",
      type: "number",
      message: `Enter token decimals:`,
      validate: (value) => validateEmptyValue(String(value).trim()),
    },

    {
      name: "initialSupplyOwner",
      type: "text",
      message: `Enter initial supply owner:`,
      validate: (value) => validateEmptyValue(String(value).trim()),
      initial: ownerAddress,
    },
  ]);
  superTokenInfo = { ...superTokenInfo, ...info };
  superTokenInfo.symbol = superTokenInfo.symbol.toUpperCase();
  if (isFreshDeployment) {
    const response = await prompts([
      {
        name: "initialSupply",
        type: "text",
        message: `Enter initial supply(enter formatted value, ex: 1000 for 1000 WETH) :`,
        validate: (value) => validateEmptyValue(String(value).trim()),
      },
      {
        name: "initialChain",
        type: "select",
        message:
          "Select the chain where this initial supply is to be minted (to mint on multiple chains, contact team)",
        choices: controllerChains.map((chain) => {
          return {
            title: chainSlugReverseMap.get(String(chain)),
            value: chain,
          };
        }),
      },
    ]);
    superTokenInfo.initialSupply = response.initialSupply;
    superTokenInfo.initialChain = response.initialChain;
  } else {
    while (true) {
      const response = await prompts([
        {
          name: "chain",
          type: "select",
          message: "Select the chain where the token is already deployed",
          choices: [...vaultChains, ...controllerChains].map((chain) => {
            return {
              title: chainSlugReverseMap.get(String(chain)),
              value: chain,
            };
          }),
        },
        {
          name: "address",
          type: "text",
          message:
            "Enter the address of the deployed token on the selected chain",
          validate: (value) => validateEthereumAddress(value.trim()),
        },
        {
          name: "addMoreTokens",
          type: "confirm",
          message:
            "Want to add more token addresses? If a token is already deployed somewhere, script won't deploy again.",
        },
      ]);

      superTokenInfo.currentAddresses = superTokenInfo.currentAddresses ?? [];
      superTokenInfo.currentAddresses.push({
        token: superTokenInfo.symbol.toUpperCase(),
        chainSlug: response.chain,
        address: response.address,
      });
      if (!response.addMoreTokens) break;
    }
  }
  return superTokenInfo;
};

export const getMergeInboundWithTokens = async (tokens: Tokens[]) => {
  const mergeInboundWithTokens: {
    [key in Tokens]?: Tokens[];
  } = {};

  const isEthAndWethPresent =
    tokens.includes(Tokens.ETH) && tokens.includes(Tokens.WETH);
  const isUsdcAndUsdcePresent =
    tokens.includes(Tokens.USDC) && tokens.includes(Tokens.USDCE);

  if (isEthAndWethPresent) {
    const response = await prompts([
      {
        name: "mergeEthAndWeth",
        type: "confirm",
        message:
          "Want to merge ETH and WETH deposits to app chain? Both deposits will mint WETH on app chain",
      },
    ]);
    if (response.mergeEthAndWeth) {
      mergeInboundWithTokens[Tokens.ETH] = [Tokens.WETH];
      mergeInboundWithTokens[Tokens.WETH] = [Tokens.ETH];
    }
  }
  if (isUsdcAndUsdcePresent) {
    const response = await prompts([
      {
        name: "mergeUsdcAndUsdce",
        type: "confirm",
        message:
          "Want to merge USDC and USDCE deposits to app chain? Both deposits will mint USDC on app chain",
      },
    ]);
    if (response.mergeUsdcAndUsdce) {
      mergeInboundWithTokens[Tokens.USDC] = [Tokens.USDCE];
      mergeInboundWithTokens[Tokens.USDCE] = [Tokens.USDC];
    }
  }
  return mergeInboundWithTokens;
};

export const getSuperbridgeMissingTokenAddresses = async (
  tokens: Tokens[],
  chainList: number[]
) => {
  const tokenAddresses: {
    [key in Tokens]?: {
      [chainslug: number]: string;
    };
  } = {};

  for (const token of tokens) {
    tokenAddresses[token] = {};
    for (const chain of chainList) {
      const currentAddress = ExistingTokenAddresses[chain]?.[token];
      if (currentAddress) continue;
      const response = await prompts([
        {
          name: "address",
          type: "text",
          message: `Enter the address of the deployed token ${token} on the chain ${getChainName(
            chain
          )}`,
          validate: (value) => validateEthereumAddress(value.trim()),
        },
      ]);
      tokenAddresses[token][chain] = response.address;
    }
  }
  return tokenAddresses;
};
