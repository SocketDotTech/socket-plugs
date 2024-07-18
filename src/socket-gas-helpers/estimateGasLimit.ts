import { BigNumber, providers, utils } from "ethers";
import PlugABI from "@socket.tech/dl-core/artifacts/abi/IPlug.json";

import { ChainDetails, Inputs, getPayload } from "./utils";
import { getArbitrumGasLimitEstimate } from "./arb-estimate";
import { getOpAndEthGasLimitEstimate } from "./op-n-eth-estimate";
import {
  arbChains,
  arbL3Chains,
  DeploymentMode,
  getAddresses,
} from "@socket.tech/dl-core";

export const estimateGasLimit = async (
  chainDetails: ChainDetails,
  inputs: Inputs
): Promise<BigNumber> => {
  const srcChainSlug = chainDetails.srcChainSlug;

  const provider = new providers.StaticJsonRpcProvider(chainDetails.dstRPC);
  const payload = await getPayload(inputs, provider);

  const abiInterface = new utils.Interface(PlugABI);
  const data = abiInterface.encodeFunctionData("inbound", [
    srcChainSlug,
    payload,
  ]);

  const txData = {
    from: getAddresses(chainDetails.srcChainSlug, DeploymentMode.PROD).Socket,
    to: inputs.connectorPlug,
    data,
  };

  if (
    arbChains.includes(chainDetails.dstChainSlug) ||
    arbL3Chains.includes(chainDetails.dstChainSlug)
  ) {
    return await getArbitrumGasLimitEstimate(provider, txData);
  } else {
    // works for opt and eth like chains
    return await getOpAndEthGasLimitEstimate(provider, txData);
  }
};
