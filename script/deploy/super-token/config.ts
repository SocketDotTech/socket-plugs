import { socketOwner } from "../../helpers/constants";
import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";

export const config = {
  projectName: "TIMESWAP",
  tokenName: "time",
  tokenSymbol: "TIME",
  tokenDecimal: 18,
  initialSupplyOwner: socketOwner,
  owner: socketOwner,
  initialSupply: 0, //parseUnits("1000000", "ether"),
  superTokenChains: [ChainSlug.OPTIMISM_GOERLI, ChainSlug.ARBITRUM_GOERLI],
  vaultTokens: {
    [ChainSlug.POLYGON_MUMBAI]: {
      token: "0xB24d5ef4066Ba3eAF276313F6c476b82a5eDd780",
    },
  },
  integrationType: IntegrationTypes.fast,
  depositLimit: "10000",
  depositRate: "0.11574",
  withdrawLimit: "10000",
  withdrawRate: "0.11574",
};
