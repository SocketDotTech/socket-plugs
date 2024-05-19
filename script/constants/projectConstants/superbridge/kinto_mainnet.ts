
import {
    ChainSlug,
    DeploymentMode,
    IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
    [DeploymentMode.PROD]: {
  [Tokens.DAI]: {
    vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        }
      }
    }
  },
  [Tokens.WSTETH]: {
    vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        }
      }
    }
  },
  [Tokens.WETH]: {
    vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "324",
            receivingLimit: "324"
          }
        }
      }
    }
  },
  [Tokens.USDC]: {
    vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM, ChainSlug.BASE],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        }
      }
    }
  },
  [Tokens.ENA]: {
    vaultChains: [ChainSlug.MAINNET],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1400000",
            receivingLimit: "1400000"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1400000",
            receivingLimit: "1400000"
          }
        },
      }
    }
  },
  [Tokens.USDe]: {
    vaultChains: [ChainSlug.MAINNET, ChainSlug.ARBITRUM],
    controllerChains: [ChainSlug.KINTO],
    hook: {
      hookType: Hooks.KINTO_HOOK,
      limitsAndPoolId: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.KINTO]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            sendingLimit: "1000000",
            receivingLimit: "1000000"
          }
        }
      }
    }
  },
}
};
