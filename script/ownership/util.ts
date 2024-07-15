import {
  AppChainAddresses,
  NonAppChainAddresses,
  SBTokenAddresses,
  STControllerChainAddresses,
  STTokenAddresses,
  STVaultChainAddresses,
} from "../../src";

export type ContractList = { label: string; address: string }[];

export const getContractList = (
  tokenAddresses: SBTokenAddresses | STTokenAddresses,
  chainSlug: string,
  token: string
): ContractList => {
  const contractList: ContractList = [];

  if ((tokenAddresses as AppChainAddresses).isAppChain) {
    contractList.push({
      address: (tokenAddresses as AppChainAddresses).Controller,
      label: `${chainSlug}, ${token}, Controller`,
    });
    contractList.push({
      address: (tokenAddresses as AppChainAddresses).MintableToken,
      label: `${chainSlug}, ${token}, MintableToken`,
    });
  } else if ((tokenAddresses as NonAppChainAddresses).isAppChain === false) {
    contractList.push({
      address: (tokenAddresses as NonAppChainAddresses).Vault,
      label: `${chainSlug}, ${token}, Vault`,
    });
    contractList.push({
      address: (tokenAddresses as NonAppChainAddresses).NonMintableToken,
      label: `${chainSlug}, ${token}, NonMintableToken`,
    });
  } else if ((tokenAddresses as STControllerChainAddresses).Controller) {
    contractList.push({
      address: (tokenAddresses as STControllerChainAddresses).Controller,
      label: `${chainSlug}, ${token}, Controller`,
    });
    contractList.push({
      address: (tokenAddresses as STControllerChainAddresses).SuperToken,
      label: `${chainSlug}, ${token}, SuperToken`,
    });
  } else if ((tokenAddresses as STVaultChainAddresses).Vault) {
    contractList.push({
      address: (tokenAddresses as STVaultChainAddresses).Vault,
      label: `${chainSlug}, ${token}, Vault`,
    });
    contractList.push({
      address: (tokenAddresses as STVaultChainAddresses).NonMintableToken,
      label: `${chainSlug}, ${token}, NonMintableToken`,
    });
  }

  if (tokenAddresses.LimitHook) {
    contractList.push({
      address: tokenAddresses.LimitHook,
      label: `${chainSlug}, ${token}, LimitHook`,
    });
  }
  if (tokenAddresses.LimitExecutionHook) {
    contractList.push({
      address: tokenAddresses.LimitExecutionHook,
      label: `${chainSlug}, ${token}, LimitExecutionHook`,
    });
  }
  if (tokenAddresses.ExecutionHelper) {
    contractList.push({
      address: tokenAddresses.ExecutionHelper,
      label: `${chainSlug}, ${token}, ExecutionHelper`,
    });
  }

  const siblings = Object.keys(tokenAddresses.connectors);
  siblings.forEach((sibling) => {
    const its = Object.keys(tokenAddresses.connectors[sibling]);
    for (const it of its) {
      contractList.push({
        address: tokenAddresses.connectors[sibling][it],
        label: `${chainSlug}, ${token}, Connector ${sibling} ${it}`,
      });
    }
  });

  return contractList;
};
