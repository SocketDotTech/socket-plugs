import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.TEST2]: {
      vaultChains: [],
      controllerChains: [ChainSlug.OPTIMISM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100.0",
              receivingLimit: "100.0",
            },
          },
        },
      },
      superTokenInfo: {
        name: Tokens.TEST2,
        symbol: Tokens.TEST2,
        decimals: 18,
        owner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupplyOwner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupply: "1000",
        initialChain: 11155420,
      },
    },
    [Tokens.TEST3]: {
      vaultChains: [],
      controllerChains: [ChainSlug.OPTIMISM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.OPTIMISM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100.0",
              receivingLimit: "100.0",
            },
          },
        },
      },
      superTokenInfo: {
        name: Tokens.TEST3,
        symbol: Tokens.TEST3,
        decimals: 18,
        owner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupplyOwner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupply: "1000",
        initialChain: 11155420,
      },
    },
  },
};
