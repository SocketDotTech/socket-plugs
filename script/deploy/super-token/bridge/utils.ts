import { Contract, Wallet } from "ethers";
import socketABI from "@socket.tech/dl-core/artifacts/abi/Socket.json";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { getMode } from "../../../constants/config";
import { Address } from "hardhat-deploy/dist/types";
import { ethers } from "hardhat";

export const getSocket = (chain: ChainSlug, signer: Wallet): Contract => {
  return new Contract(getAddresses(chain, getMode()).Socket, socketABI, signer);
};

export const getInstance = async (
  contractName: string,
  address: Address
): Promise<Contract> => ethers.getContractAt(contractName, address);
