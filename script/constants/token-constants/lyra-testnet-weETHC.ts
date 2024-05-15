import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { TokenConstants } from "../types";
import { getSocketOwner } from "../config";
import { SuperTokenType } from "../../../src";

const tc: TokenConstants = {
  [DeploymentMode.PROD]: {
    type: SuperTokenType.WITH_LIMIT,
    projectName: "Lyra Wrapped eETH Covered Call shares",
    tokenName: "Lyra Wrapped eETH Covered Call shares",
    tokenSymbol: "weETHC",
    tokenDecimal: 18,
    initialSupplyOwner: getSocketOwner(),
    owner: getSocketOwner(),
    initialSupply: 0,
    superTokenChains: [ChainSlug.ARBITRUM_SEPOLIA],
    vaultTokens: {
      [ChainSlug.OPTIMISM_SEPOLIA]:
        "0x8df294e199C461891AAB8e7A0584a5Ffb9f3e241",
    },
    integrationType: IntegrationTypes.fast,
    bridgeLimit: "150000",
    bridgeRate: "1.7361",
  },
};

export = tc;
