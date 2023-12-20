import { socketOwner } from "../../helpers/constants";
import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";

export const config = {
  projectName: "supertoken",
  tokenName: "time",
  tokenSymbol: "TIME",
  tokenDecimal: 18,
  initialSupplyOwner: socketOwner,
  owner: socketOwner,
  initialSupply: 0,
  superTokenChains: [ChainSlug.OPTIMISM, ChainSlug.ARBITRUM],
  vaultTokens: {
    [ChainSlug.POLYGON_MAINNET]: {
      token: "0x7Ae121F6c05057e23F4D7700e596c2a194694529",
    },
  },
  integrationType: IntegrationTypes.fast,
  depositLimit: "10000",
  depositRate: "0.11574",
  withdrawLimit: "10000",
  withdrawRate: "0.11574",
};
