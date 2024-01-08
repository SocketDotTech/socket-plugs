import { utils } from "ethers";
import { socketOwner } from "../../helpers/constants";
import { ChainSlug, IntegrationTypes } from "@socket.tech/dl-core";

export const config = {
  projectName: "looks",
  tokenName: "looks",
  tokenSymbol: "LOOKS",
  tokenDecimal: 18,
  initialSupplyOwner: socketOwner,
  owner: socketOwner,
  initialSupply: 0,
  superTokenChains: [ChainSlug.ARBITRUM_SEPOLIA, ChainSlug.OPTIMISM_SEPOLIA],
  vaultTokens: {
    [ChainSlug.SEPOLIA]: {
      token: "0xa68c2CaA3D45fa6EBB95aA706c70f49D3356824E",
    },
  },
  integrationType: IntegrationTypes.fast,
  depositLimit: "150000",
  depositRate: "1.7361",
  withdrawLimit: "150000",
  withdrawRate: "1.7361",
};

export const srcChain = ChainSlug.ARBITRUM_SEPOLIA;
export const dstChain = ChainSlug.SEPOLIA;
export const gasLimit = 500_000;
export const amount = utils.parseUnits("1", config.tokenDecimal);
