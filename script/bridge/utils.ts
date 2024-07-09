import { BigNumber } from "ethers";
import { ChainSlug, SBTokenAddresses, STTokenAddresses } from "../../src";
import { getHookContract } from "../helpers/common";
import { Tokens } from "../../src/enums";

export const checkSendingLimit = async (
  chain: ChainSlug,
  token: Tokens,
  addr: SBTokenAddresses | STTokenAddresses,
  connectorAddr: string,
  amountBN: BigNumber
) => {
  let { hookContract } = await getHookContract(chain, token, addr);
  if (!hookContract) {
    console.log("No hook contract found, skipping limit check");
    return;
  }
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
