import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectType, Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      projectType: ProjectType.SUPERBRIDGE,
      appChain: ChainSlug.REYA_CRONOS,
      nonAppChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      limits: {
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
      appChain: ChainSlug.REYA_CRONOS,
      projectType: ProjectType.SUPERBRIDGE,
      nonAppChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      limits: {
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
      appChain: ChainSlug.REYA_CRONOS,
      projectType: ProjectType.SUPERBRIDGE,
      nonAppChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      limits: {
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
      appChain: ChainSlug.REYA_CRONOS,
      projectType: ProjectType.SUPERBRIDGE,
      nonAppChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      limits: {
        [ChainSlug.REYA_CRONOS]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "27.33",
            sendingRate: "0.00031632",
            receivingLimit: "27.33",
            receivingRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "27.33",
            sendingRate: "0.00031632",
            receivingLimit: "27.33",
            receivingRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "27.33",
            sendingRate: "0.00031632",
            receivingLimit: "27.33",
            receivingRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "27.33",
            sendingRate: "0.00031632",
            receivingLimit: "27.33",
            receivingRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "27.33",
            sendingRate: "0.00031632",
            receivingLimit: "27.33",
            receivingRate: "0.00031632",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WBTC]: {
      appChain: ChainSlug.REYA_CRONOS,
      projectType: ProjectType.SUPERBRIDGE,
      nonAppChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      hook: Hooks.LIMIT_EXECUTION_HOOK,
      vaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.POLYGON_MUMBAI,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      limits: {
        [ChainSlug.REYA_CRONOS]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1.41",
            sendingRate: "0.00001632",
            receivingLimit: "1.41",
            receivingRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1.41",
            sendingRate: "0.00001632",
            receivingLimit: "1.41",
            receivingRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1.41",
            sendingRate: "0.00001632",
            receivingLimit: "1.41",
            receivingRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1.41",
            sendingRate: "0.00001632",
            receivingLimit: "1.41",
            receivingRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1.41",
            sendingRate: "0.00001632",
            receivingLimit: "1.41",
            receivingRate: "0.00001632",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
