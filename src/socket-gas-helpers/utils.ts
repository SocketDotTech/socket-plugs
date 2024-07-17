import { Contract, utils } from "ethers";
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
  executionData: string;
  connectorPlug: string;
  dstSocketAddress: string;
};

export type ChainDetails = {
  srcChainSlug: number;
  dstChainSlug: number;
  dstRPC: string;
  isArbStackChain: boolean
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
  provider: StaticJsonRpcProvider,
  withoutHook?: boolean
) => {
  let payload;
  if (withoutHook) {
    payload = defaultAbiCoder.encode(
      ["address", "uint256"],
      [inputs.receiver, inputs.amount]
    );
  } else {
    const connectorContract = new Contract(
      inputs.connectorPlug,
      ConnectorABI,
      provider
    );
    const msgId = await connectorContract.getMessageId();
    payload = defaultAbiCoder.encode(
      ["address", "uint256", "bytes32", "bytes"],
      [inputs.receiver, inputs.amount, msgId, inputs.executionData]
    );
  }

  return payload;
};
