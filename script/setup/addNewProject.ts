import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
  MainnetIds,
  TestnetIds,
} from "@socket.tech/dl-core";
import prompts from "prompts";
import {
  Hooks,
  ProjectConstants,
  ProjectType,
  tokensWithOnePoolId,
} from "../../src";
import { Tokens } from "../../src/enums";
import {
  ProjectConfig,
  initialLimitsForSuperbridge,
  validateEmptyValue,
  validateEthereumAddress,
} from "./common";
import {
  buildEnvFile,
  updateProjectEnums,
  updateTokenEnums,
} from "./configUtils";
import { chainSlugReverseMap } from "./enumMaps";
import { generateConstantsFile } from "./generateConstants";
import { generateTokenAddressesFile } from "./updateExistingTokenAddresses";

type TokenRateLimits = Record<
  string,
  { sendingLimit: number; receivingLimit: number }
>;

type SuperTokenInfo = {
  name: string;
  symbol: string;
  decimals: number;
  owner: string;
  initialSupplyOwner: string;
  initialSupply: string;
  initialChain?: ChainSlug;
  currentAddresses?: { chainSlug: ChainSlug; address: string; token: string }[];
};

let tokenEnum = Tokens;

export const addProject = async () => {
  const projectConfig = await getProjectInfo();
  let {
    projectName,
    projectType,
    hookType,
    owner,
    isLimitsRequired,
    chainOptions,
  } = projectConfig;

  let chainsInfo = await getChainsInfo(projectType, chainOptions);
  let { vaultChains, controllerChains } = chainsInfo;
  const allChains = [...chainsInfo.vaultChains, ...chainsInfo.controllerChains];

  let tokenInfo: {
    tokens: Tokens[];
    superTokenInfoMap?: Record<string, SuperTokenInfo>;
    mergeInboundWithTokens?: {
      [key in Tokens]?: Tokens[];
    };
  } = await getProjectTokenListInfo(
    projectType,
    owner,
    vaultChains,
    controllerChains
  );
  const { tokenLimitInfo } = await getHookRelatedInfo(
    projectType,
    isLimitsRequired,
    tokenInfo.tokens,
    tokenInfo.superTokenInfoMap
  );
  await updateProjectEnums(projectConfig.projectName, projectType);
  console.log(`✔  Updated Enums :Project`);
  await buildEnvFile(
    projectConfig.projectName,
    projectConfig.projectType,
    projectConfig.owner,
    tokenInfo.tokens,
    allChains
  );

  let projectConstants = await buildProjectConstants(
    tokenInfo,
    chainsInfo,
    hookType,
    isLimitsRequired,
    tokenLimitInfo,
    allChains
  );
  generateConstantsFile(projectType, projectName, projectConstants);

  console.log(
    `✔ Setup done! You can run this script again to add new projects, add new tokens, or edit project`
  );
};

export const getProjectInfo = async () => {
  const currentOwnerAddress = process.env.OWNER_ADDRESS;
  let projectInfo: ProjectConfig = await prompts([
    {
      name: "projectType",
      type: "select",
      choices: [
        {
          title: "SuperBridge",
          value: ProjectType.SUPERBRIDGE,
        },
        {
          title: "SuperToken",
          value: ProjectType.SUPERTOKEN,
        },
      ],
      message: "Select project type",
    },
    {
      name: "projectName",
      type: "text",
      message:
        "Enter project name (use underscore instead of spaces, eg: socket_bridge)",
    },
    {
      name: "owner",
      type: "text",
      message:
        "Enter owner Address * (Owner will be the deployer initially to configure roles)",
      initial: currentOwnerAddress,
      validate: (value) => validateEthereumAddress(value.trim()),
    },
    {
      name: "hookType",
      type: "select",
      choices: [
        {
          title: "Limit Hook",
          value: Hooks.LIMIT_HOOK,
        },
        {
          title: "Limit Execution Hook",
          value: Hooks.LIMIT_EXECUTION_HOOK,
        },
        {
          title: "No Hook",
          value: Hooks.NO_HOOK,
        },
      ],
      message: "Select Hook type (Recommended: Limit Hook)",
    },
    {
      name: "isMainnet",
      type: "toggle",
      message: "Is the deployment for mainnet?",
      active: "yes",
      inactive: "no",
    },
  ]);

  projectInfo.projectName = projectInfo.isMainnet
    ? projectInfo.projectName + "_mainnet"
    : projectInfo.projectName + "_testnet";
  projectInfo.projectName = projectInfo.projectName.toLowerCase().trim();
  projectInfo.owner = projectInfo.owner.trim();
  let isLimitsRequired =
    projectInfo.hookType === Hooks.LIMIT_HOOK ||
    projectInfo.hookType === Hooks.LIMIT_EXECUTION_HOOK;
  let possibleChains = projectInfo.isMainnet ? MainnetIds : TestnetIds;
  let chainOptions = possibleChains.map((chain) => ({
    title: chainSlugReverseMap.get(String(chain)),
    value: chain,
  }));
  return { ...projectInfo, isLimitsRequired, chainOptions };
};
export const getChainsInfo = async (
  projectType: ProjectType,
  chainOptions: { title: string; value: number }[]
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select vault chains (src chains, where token is already present and will be locked in bridge contract. check README for more info)",
        choices: chainOptions,
        min: 1,
        max: 20,
      },
    ]);

    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "select",
        message:
          "Select controller chain (app chain, where token will be minted/burned. check README for more info)",
        choices: controllerChainOptions,
      },
    ]);
    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: [controllerChainsInfo.controllerChains],
    };
  } else {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select a vault chain, if applicable (where token is already present and will be locked to bridge to other chains. Press enter without selecting anything if fresh supertoken deployment. check README for more info)",
        choices: chainOptions,
        min: 0,
        max: 1,
      },
    ]);
    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "multiselect",
        min: 1,
        max: 20,
        message:
          "Select controller chains, where token will be minted/burned (check README for more info)",
        choices: controllerChainOptions,
      },
    ]);

    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: controllerChainsInfo.controllerChains,
    };
  }
};

export const getProjectTokenListInfo = async (
  projectType: ProjectType,
  ownerAddress: string,
  vaultChains: ChainSlug[],
  controllerChains: ChainSlug[]
) => {
  let tokenChoices = Object.keys(tokenEnum).map((token) => ({
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
    const isEthAndWethPresent =
      tokens.includes(Tokens.ETH) && tokens.includes(Tokens.WETH);
    const isUsdcAndUsdcePresent =
      tokens.includes(Tokens.USDC) && tokens.includes(Tokens.USDCE);

    const mergeInboundWithTokens: {
      [key in Tokens]?: Tokens[];
    } = {};

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

    return { tokens, mergeInboundWithTokens };
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

export const getHookRelatedInfo = async (
  projectType: ProjectType,
  isLimitsRequired: boolean,
  tokens: Tokens[],
  superTokenInfoMap: Record<string, SuperTokenInfo> = {}
) => {
  let tokenLimitInfo: TokenRateLimits = {};
  if (isLimitsRequired) {
    for (let token of tokens) {
      const initialValue = await getInitialLimitValue(
        projectType,
        token,
        superTokenInfoMap
      );
      // console.log("initialValue", initialValue, tokens);
      // console.log(initialValue.sendingLimit, initialValue.receivingLimit);
      let limitInfo = await prompts([
        {
          name: "sendingLimit",
          type: "text",
          message: `Enter max daily sending limit for ${token} (Enter formatted values, 100.0 for 100 USDC. Check README for more info):`,
          validate: (value) => validateEmptyValue(String(value).trim()),
          initial: String(initialValue.sendingLimit),
        },
        {
          name: "receivingLimit",
          type: "text",
          message: `Enter max daily receiving limit for ${token} (Enter formatted values, 100.0 for 100 USDC Check README for more info):`,
          validate: (value) => validateEmptyValue(String(value).trim()),
          initial: String(initialValue.receivingLimit),
        },
      ]);

      tokenLimitInfo[token] = limitInfo;
    }
  }
  return { tokenLimitInfo };
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

  let info = await prompts([
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
    let response = await prompts([
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
      let response = await prompts([
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

export const buildProjectConstants = async (
  tokenInfo: {
    tokens: Tokens[];
    superTokenInfoMap?: Record<string, SuperTokenInfo>;
    mergeInboundWithTokens?: {
      [key in Tokens]?: Tokens[];
    };
  },
  chainsInfo: { vaultChains: ChainSlug[]; controllerChains: ChainSlug[] },
  hookType: Hooks,
  isLimitsRequired: boolean,
  tokenLimitInfo: TokenRateLimits,
  allChains: ChainSlug[]
) => {
  let projectConstants: ProjectConstants = {
    [DeploymentMode.PROD]: {},
  };

  for (const token of tokenInfo.tokens) {
    const poolCount = tokensWithOnePoolId.includes(token) ? 1 : undefined; // If poolCount is not 1, assign undefined to avoid adding poolCount 0 in constants file.
    const limitsAndPoolId = {};
    for (const chain of allChains) {
      limitsAndPoolId[chain] = {
        [IntegrationTypes.fast]: { ...tokenLimitInfo[token], poolCount },
      };
    }

    projectConstants[DeploymentMode.PROD][token] = {
      vaultChains: chainsInfo.vaultChains,
      controllerChains: chainsInfo.controllerChains,
      mergeInboundWithTokens: tokenInfo.mergeInboundWithTokens[token],
      hook: {
        hookType,
      },
    };

    const superTokenInfo = tokenInfo.superTokenInfoMap?.[token];
    if (superTokenInfo) {
      delete superTokenInfo.currentAddresses;
      projectConstants[DeploymentMode.PROD][token].superTokenInfo =
        superTokenInfo;
    }

    if (isLimitsRequired) {
      projectConstants[DeploymentMode.PROD][token].hook.limitsAndPoolId =
        limitsAndPoolId;
    }
  }

  return JSON.parse(JSON.stringify(projectConstants)); // stringify and parse to remove undefined values
};

export const getInitialLimitValue = async (
  projectType: ProjectType,
  token: Tokens,
  superTokenInfoMap: Record<string, SuperTokenInfo> = {}
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    return (
      initialLimitsForSuperbridge[token] ?? {
        sendingLimit: 0,
        receivingLimit: 0,
      }
    );
  } else if (projectType == ProjectType.SUPERTOKEN) {
    let info = superTokenInfoMap[token.toUpperCase()];
    return {
      sendingLimit: info?.initialSupply
        ? parseInt(info?.initialSupply) / 100
        : 0,
      receivingLimit: info?.initialSupply
        ? parseInt(info?.initialSupply) / 100
        : 0,
    };
    // think about using initial supply
  }
};
