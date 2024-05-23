import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Hooks, ProjectConstants } from "../../../../src";
import { Tokens } from "../../../../src/enums";

export const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.TESTOKEN]: {
      vaultChains: [],
      controllerChains: [ChainSlug.SEPOLIA, ChainSlug.ARBITRUM_SEPOLIA],
      hook: {
        hookType: Hooks.LIMIT_HOOK,
        limitsAndPoolId: {
          [ChainSlug.ARBITRUM_SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100.0",
              receivingLimit: "100.0",
            },
          },
          [ChainSlug.SEPOLIA]: {
            [IntegrationTypes.fast]: {
              sendingLimit: "100.0",
              receivingLimit: "100.0",
            },
          },
        },
      },
      superTokenInfo: {
        name: Tokens.TESTOKEN,
        symbol: Tokens.TESTOKEN,
        decimals: 18,
        owner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupplyOwner: "0x265311267f352A24a8332ED0E1AD7e2AB610451B",
        initialSupply: "1000",
        initialChain: 421614,
      },
    },
  },
};
