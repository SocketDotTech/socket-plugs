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
      appChain: ChainSlug.SYNDR_SEPOLIA_L3,
      nonAppChains: {
        // [ChainSlug.SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        // [ChainSlug.POLYGON_MUMBAI]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
      },
    },
    [Tokens.USDT]: {
      appChain: ChainSlug.SYNDR_SEPOLIA_L3,
      nonAppChains: {
        // [ChainSlug.SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        // [ChainSlug.POLYGON_MUMBAI]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
      },
    },
    [Tokens.DAI]: {
      appChain: ChainSlug.SYNDR_SEPOLIA_L3,
      nonAppChains: {
        // [ChainSlug.SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        // [ChainSlug.POLYGON_MUMBAI]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.SYNDR_SEPOLIA_L3,
      nonAppChains: {
        // [ChainSlug.SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        // [ChainSlug.POLYGON_MUMBAI]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
      },
    },
    [Tokens.WBTC]: {
      appChain: ChainSlug.SYNDR_SEPOLIA_L3,
      nonAppChains: {
        // [ChainSlug.SEPOLIA]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
        [ChainSlug.ARBITRUM_SEPOLIA]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000",
            depositRate: "0.11574",
            withdrawLimit: "10000",
            withdrawRate: "0.11574",
            poolCount: 0,
          },
        },
        // [ChainSlug.POLYGON_MUMBAI]: {
        //   [IntegrationTypes.fast]: {
        //     depositLimit: "10000",
        //     depositRate: "0.11574",
        //     withdrawLimit: "10000",
        //     withdrawRate: "0.11574",
        //     poolCount: 0,
        //   },
        // },
      },
    },
  },
};

export = pc;
