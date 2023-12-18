import { parseUnits } from "ethers/lib/utils";
import { socketOwner } from "../../helpers/constants";
import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";

export const config = {
  projectName: "TIMESWAP",
  tokenName: "time",
  tokenSymbol: "TIME",
  tokenDecimal: 18,
  initialSupplyOwner: socketOwner,
  owner: socketOwner,
  initialSupply: parseUnits("1000000", "ether"),
  superTokenChains: [ChainSlug.OPTIMISM_SEPOLIA, ChainSlug.POLYGON_MUMBAI],
  vaultTokens: {
    [ChainSlug.ARBITRUM_SEPOLIA]: {
      token: "",
    },
  },
  integrationType: IntegrationTypes.fast,
  depositLimit: "10000",
  depositRate: "0.11574",
  withdrawLimit: "10000",
  withdrawRate: "0.11574",
};
