import { BigNumber, Contract, Wallet, utils } from "ethers";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { getProjectAddresses, getInstance } from "../helpers/utils";
import {
  TokenAddresses,
  HookContracts,
} from "../../src";
import { getToken } from "../constants/config";




export const checkSendingLimit = async (
    addr:TokenAddresses,
    connectorAddr: string,
    amountBN: BigNumber,
    socketSigner: Wallet
  ) => {
  
    let hook = await getHookContract(addr, socketSigner);
    if (!hook) return;
  
    const limit: BigNumber = await hook.getCurrentSendingLimit(connectorAddr);
      if (limit.lt(amountBN)) throw new Error("Exceeding max limit");
  
  
  }
  
  export const checkReceivingLimit = async (
    addr:TokenAddresses,
    connectorAddr: string,
    amountBN: BigNumber,
    socketSigner: Wallet
  ) => {
  
    let hook = await getHookContract(addr, socketSigner);
    if (!hook) return;
  
    const limit: BigNumber = await hook.getCurrentReceivingLimit(connectorAddr);
      if (limit.lt(amountBN)) throw new Error("Exceeding max limit");
  
  
  }

  
 export const getHookContract = async (addr: TokenAddresses, socketSigner: Wallet) => {
    let instance: Contract;
    if (addr.LimitHook) {
      instance = await getInstance(HookContracts.LimitHook, addr.LimitHook);
    } else if (addr.LimitExecutionHook) {
      instance = await getInstance(
        HookContracts.LimitExecutionHook,
        addr.LimitExecutionHook
      );
    }
    if (!instance) return undefined;
    return instance.connect(socketSigner);
  
  }
  