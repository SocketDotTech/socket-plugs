import { Contract, Wallet } from "ethers";
import socketABI from "@socket.tech/dl-core/artifacts/abi/Socket.json";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import { getMode } from "../constants/config";

export const getSocket = (chain: ChainSlug, signer: Wallet): Contract => {
  return new Contract(getAddresses(chain, getMode()).Socket, socketABI, signer);
};
