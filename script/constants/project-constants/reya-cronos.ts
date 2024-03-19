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
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
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
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
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
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
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
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
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
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.POLYGON_MUMBAI]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.OPTIMISM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "100",
            depositRate: "0.001157",
            withdrawLimit: "100",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
