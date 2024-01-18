import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";
import { getSocketOwner } from "../../constants/config";

export const config = {
  projectName: "test",
  tokenName: "test",
  tokenSymbol: "TEST",
  tokenDecimal: 18,
  initialSupplyOwner: getSocketOwner(),
  owner: getSocketOwner(),
  initialSupply: 0,
  superTokenChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
  vaultTokens: {
    [ChainSlug.SEPOLIA]: {
      token: "0xFD093e2a4d3190b2020C95846dBe5fD073721e89",
    },
  },
  integrationType: IntegrationTypes.fast,
  bridgeLimit: "150000",
  bridgeRate: "1.7361",
};
