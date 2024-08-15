import prompts from "prompts";
import { ProjectType } from "../../../src";

export const getChainsInfo = async (
  projectType: ProjectType,
  chainOptions: { title: string; value: number }[]
) => {
  if (projectType == ProjectType.SUPERBRIDGE) {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select vault chains (src chains, where token is already present and will be locked in bridge contract. check README for more info)",
        choices: chainOptions,
        min: 1,
        max: 20,
      },
    ]);

    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "select",
        message:
          "Select controller chain (app chain, where token will be minted/burned. check README for more info)",
        choices: controllerChainOptions,
      },
    ]);
    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: [controllerChainsInfo.controllerChains],
    };
  } else {
    const vaultChainsInfo = await prompts([
      {
        name: "vaultChains",
        type: "multiselect",
        message:
          "Select a vault chain, if applicable (where token is already present and will be locked to bridge to other chains. Press enter without selecting anything if fresh supertoken deployment. check README for more info)",
        choices: chainOptions,
        min: 0,
        max: 1,
      },
    ]);
    const controllerChainOptions = chainOptions.filter(
      (chainOption) => !vaultChainsInfo.vaultChains.includes(chainOption.value)
    );
    const controllerChainsInfo = await prompts([
      {
        name: "controllerChains",
        type: "multiselect",
        min: 1,
        max: 20,
        message:
          "Select controller chains, where token will be minted/burned (check README for more info)",
        choices: controllerChainOptions,
      },
    ]);

    return {
      vaultChains: vaultChainsInfo.vaultChains,
      controllerChains: controllerChainsInfo.controllerChains,
    };
  }
};
