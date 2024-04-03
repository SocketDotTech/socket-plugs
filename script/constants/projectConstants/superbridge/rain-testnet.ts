import {
    ChainSlug,
    DeploymentMode,
    IntegrationTypes,
  } from "@socket.tech/dl-core";
  import {
    Hooks,
    ProjectConstants,
    Tokens,
  } from "../../../../src";
  
  const pc: ProjectConstants = {
    [DeploymentMode.PROD]: {
      [Tokens.USDC]: {
        vaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
        controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
        hook: {
          hookType: Hooks.LIMIT_EXECUTION_HOOK,
          limitsAndPoolId: {
            [ChainSlug.ARBITRUM_SEPOLIA]: {
              [IntegrationTypes.fast]: {
                sendingLimit: "50000",
                receivingLimit: "50000",
              },
            },
            [ChainSlug.OPTIMISM_SEPOLIA]: {
              [IntegrationTypes.fast]: {
                sendingLimit: "50000",
                receivingLimit: "50000",
                poolCount: 1,
              },
            },
          },
        },
      },
      [Tokens.WETH]: {
        vaultChains: [ChainSlug.OPTIMISM_SEPOLIA],
        controllerChains: [ChainSlug.ARBITRUM_SEPOLIA],
        hook: {
          hookType: Hooks.LIMIT_EXECUTION_HOOK,
          limitsAndPoolId: {
            [ChainSlug.ARBITRUM_SEPOLIA]: {
              [IntegrationTypes.fast]: {
                sendingLimit: "500",
                receivingLimit: "500",
              },
            },
            [ChainSlug.OPTIMISM_SEPOLIA]: {
              [IntegrationTypes.fast]: {
                sendingLimit: "500",
                receivingLimit: "500",
                poolCount: 1,
              },
            },
          },
        },
      },
    },
  };
  
  export = pc;
  