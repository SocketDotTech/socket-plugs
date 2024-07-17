import { BigNumber, providers, utils } from "ethers";
import PlugABI from "@socket.tech/dl-core/artifacts/abi/IPlug.json";

import { ChainDetails, Inputs, getPayload } from "./utils";
import { getArbitrumGasLimitEstimate } from "./arb-estimate";
import { getOpAndEthGasLimitEstimate } from "./op-n-eth-estimate";

export const estimateGasLimit = async (
  chainDetails: ChainDetails,
  inputs: Inputs,
  withoutHook?: boolean
): Promise<BigNumber> => {
  const srcChainSlug = chainDetails.srcChainSlug;

  const provider = new providers.StaticJsonRpcProvider(chainDetails.dstRPC);
  const payload = await getPayload(inputs, provider, withoutHook);

  const abiInterface = new utils.Interface(PlugABI);
  const data = abiInterface.encodeFunctionData("inbound", [
    srcChainSlug,
    payload,
  ]);

  const txData = {
    from: inputs.dstSocketAddress,
    to: inputs.connectorPlug,
    data,
  };

  if (chainDetails.isArbStackChain) {
    return await getArbitrumGasLimitEstimate(provider, txData);
  } else {
    // works for opt and eth like chains
    return await getOpAndEthGasLimitEstimate(provider, txData);
  }
};
