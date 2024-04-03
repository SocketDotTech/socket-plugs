import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";

import { Hooks, ProjectConstants, ProjectType, Tokens } from "../../../../src";


const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook:{ hookType: Hooks.LIMIT_EXECUTION_HOOK},
      
      limitsAndPoolId: {
        [ChainSlug.REYA_CRONOS]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.USDT]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook:{ hookType: Hooks.LIMIT_EXECUTION_HOOK},
      
      limitsAndPoolId: {
        [ChainSlug.REYA_CRONOS]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: "1.1574",
            receivingLimit: "100000",
            receivingRate: "1.1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.DAI]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook:{ hookType: Hooks.LIMIT_EXECUTION_HOOK},
      
      limitsAndPoolId: {
        [ChainSlug.REYA_CRONOS]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: ".1574",
            receivingLimit: "100000",
            receivingRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: ".1574",
            receivingLimit: "100000",
            receivingRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: ".1574",
            receivingLimit: "100000",
            receivingRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: ".1574",
            receivingLimit: "100000",
            receivingRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "100000",
            sendingRate: ".1574",
            receivingLimit: "100000",
            receivingRate: ".1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETH]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      
      
      hook:{ hookType: Hooks.LIMIT_EXECUTION_HOOK,
      
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MUMBAI]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "27.33",
              receivingLimit: "27.33",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],

    },
    [Tokens.WBTC]: {
      controllerChains: [ChainSlug.REYA_CRONOS],
      
      
      hook:{ hookType: Hooks.LIMIT_EXECUTION_HOOK,
        limitsAndPoolId: {
          [ChainSlug.REYA_CRONOS]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.POLYGON_MUMBAI]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "1.41",
              receivingLimit: "1.41",
              poolCount: 0,
            },
          },
        },
      },
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      
    },
  },
};

export = pc;
