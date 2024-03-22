import { Contract, Wallet } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { getMode } from "../constants/config";
import socketABI from "@socket.tech/dl-core/artifacts/abi/Socket.json";
import { Address } from "hardhat-deploy/dist/types";
import { ethers } from "hardhat";
import {
  SuperTokenChainAddresses,
  SuperTokenContracts,
  SuperTokenType,
} from "../../src";

export const getSocket = (chain: ChainSlug, signer: Wallet): Contract => {
  return new Contract(getAddresses(chain, getMode()).Socket, socketABI, signer);
};

export const getInstance = async (
  contractName: string,
  address: Address
): Promise<Contract> => ethers.getContractAt(contractName, address);

// export const getVault = async (
//   config: TokenConfigs,
//   addresses: SuperTokenChainAddresses
// ): Promise<Contract> => {
//   const contractName =
//     config.type == SuperTokenType.WITH_LIMIT
//       ? SuperTokenContracts.SuperTokenVault
//       : SuperTokenContracts.SuperTokenVaultWithExecutionPayload;

//   const vaultAddress = addresses[contractName];
//   if (!vaultAddress) throw new Error("vault contract addresses missing");

//   return await getInstance(contractName, vaultAddress);
// };

// export const getToken = async (
//   config: TokenConfigs,
//   addresses: SuperTokenChainAddresses
// ): Promise<Contract> => {
//   const contractName =
//     config.type == SuperTokenType.WITH_LIMIT
//       ? SuperTokenContracts.SuperToken
//       : SuperTokenContracts.SuperTokenWithExecutionPayload;

//   const tokenAddr = addresses[contractName];
//   if (!tokenAddr) throw new Error("token contract addresses missing");

//   return await getInstance(contractName, tokenAddr);
// };
