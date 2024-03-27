import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.USDT]: {
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: "1.1574",
            withdrawLimit: "100000",
            withdrawRate: "1.1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.DAI]: {
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: ".1574",
            withdrawLimit: "100000",
            withdrawRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: ".1574",
            withdrawLimit: "100000",
            withdrawRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: ".1574",
            withdrawLimit: "100000",
            withdrawRate: ".1574",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100000",
            depositRate: ".1574",
            withdrawLimit: "100000",
            withdrawRate: ".1574",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [
        ChainSlug.ARBITRUM_SEPOLIA,
        ChainSlug.SEPOLIA,
        ChainSlug.OPTIMISM_SEPOLIA,
      ],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "27.33",
            depositRate: "0.00031632",
            withdrawLimit: "27.33",
            withdrawRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "27.33",
            depositRate: "0.00031632",
            withdrawLimit: "27.33",
            withdrawRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "27.33",
            depositRate: "0.00031632",
            withdrawLimit: "27.33",
            withdrawRate: "0.00031632",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "27.33",
            depositRate: "0.00031632",
            withdrawLimit: "27.33",
            withdrawRate: "0.00031632",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WBTC]: {
      appChain: ChainSlug.REYA_CRONOS,
      nativeVaultChains: [],
      nonAppChains: {
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "1.41",
            depositRate: "0.00001632",
            withdrawLimit: "1.41",
            withdrawRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "1.41",
            depositRate: "0.00001632",
            withdrawLimit: "1.41",
            withdrawRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "1.41",
            depositRate: "0.00001632",
            withdrawLimit: "1.41",
            withdrawRate: "0.00001632",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "1.41",
            depositRate: "0.00001632",
            withdrawLimit: "1.41",
            withdrawRate: "0.00001632",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
