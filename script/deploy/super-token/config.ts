import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { getSocketOwner } from "../../constants/config";

export const config = {
  projectName: "ethena",
  tokenName: "USDe",
  tokenSymbol: "USDe",
  tokenDecimal: 18,
  initialSupplyOwner: getSocketOwner(),
  owner: getSocketOwner(),
  initialSupply: 0,
  superTokenChains: [ChainSlug.OPTIMISM_SEPOLIA],
  vaultTokens: {
    [ChainSlug.SEPOLIA]: {
      token: "0x9458CaACa74249AbBE9E964b3Ce155B98EC88EF2",
    },
  },
  integrationType: IntegrationTypes.fast,
  bridgeLimit: "150000",
  bridgeRate: "1.7361",
};
