import { BigNumber } from "ethers";
import {
  ChainSlug,
  SBTokenAddresses,
  STTokenAddresses,
  Tokens,
} from "../../src";
import { getHookContract } from "../helpers/common";

export const checkSendingLimit = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses,
  connectorAddr: string,
  amountBN: BigNumber
) => {
  let { hookContract } = await getHookContract(chain, token, addr);
  const limit: BigNumber = await hookContract.getCurrentSendingLimit(
    connectorAddr
  );
  if (limit.lt(amountBN)) throw new Error("Exceeding max limit");
};

export const checkReceivingLimit = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses,
  connectorAddr: string,
  amountBN: BigNumber
) => {
  let { hookContract } = await getHookContract(chain, token, addr);
  const limit: BigNumber = await hookContract.getCurrentReceivingLimit(
    connectorAddr
  );
  if (limit.lt(amountBN)) throw new Error("Exceeding max limit");
};
