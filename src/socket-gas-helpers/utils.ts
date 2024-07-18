import { Contract } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { StaticJsonRpcProvider } from "@ethersproject/providers";

export type TxData = {
  from: string;
  to: string;
  data: string;
};

export type Inputs = {
  amount: string;
  receiver: string;
  extraData: string;
  connectorPlug: string;
};

export type ChainDetails = {
  srcChainSlug: number;
  dstChainSlug: number;
  dstRPC: string;
};

const ConnectorABI = [
  {
    inputs: [],
    name: "getMessageId",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export const getPayload = async (
  inputs: Inputs,
  provider: StaticJsonRpcProvider
) => {
  const connectorContract = new Contract(
    inputs.connectorPlug,
    ConnectorABI,
    provider
  );
  const msgId = await connectorContract.getMessageId();
  return defaultAbiCoder.encode(
    ["address", "uint256", "bytes32", "bytes"],
    [inputs.receiver, inputs.amount, msgId, inputs.extraData]
  );
};
