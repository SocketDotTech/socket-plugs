import { BigNumber, Contract, Wallet } from "ethers";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";

import {
  SuperTokenAddresses,
  SuperTokenChainAddresses,
  SuperTokenContracts,
} from "../../../src";
import { getSignerFromChainSlug, overrides } from "../../helpers/networks";
import { getInstance } from "../../helpers/utils";
import { mode } from "../../helpers/constants";
import { getSocket } from "../../bridge/utils";
import {
  getSuperTokenLimitBN,
  getSuperTokenProjectAddresses,
  getSuperTokenRateBN,
} from "./utils";
import { config } from "./config";

type UpdateLimitParams = [
  boolean,
  number,
  string | number | BigNumber,
  string | number | BigNumber
];

export const main = async () => {
  try {
    const addresses: SuperTokenAddresses = await getSuperTokenProjectAddresses(
      config.projectName
    );
    const chains = Object.keys(addresses).map((c) => parseInt(c) as ChainSlug);

    await Promise.all(
      chains.map(async (chain) => {
        const addr: SuperTokenChainAddresses | undefined = addresses[chain];
        const plug: string = addr?.[SuperTokenContracts.SocketPlug];
        const siblingSlugs: ChainSlug[] = chains.filter((c) => c != chain);
        if (!addr || !plug) return;
        console.log(`Configuring ${chain} for ${siblingSlugs}`);

        const socketSigner = getSignerFromChainSlug(chain);
        await connect(addresses, chain, siblingSlugs, socketSigner);

        const updateLimitParams: UpdateLimitParams[] = [];
        for (let sibling of siblingSlugs) {
          // mint/lock/deposit limits
          updateLimitParams.push([
            true,
            sibling,
            getSuperTokenLimitBN(
              config.depositLimit,
              true,
              config.tokenDecimal
            ),
            getSuperTokenRateBN(config.depositRate, true, config.tokenDecimal),
          ]);

          // burn/unlock/withdraw limits
          updateLimitParams.push([
            false,
            sibling,
            getSuperTokenLimitBN(
              config.withdrawLimit,
              false,
              config.tokenDecimal
            ),
            getSuperTokenRateBN(
              config.withdrawRate,
              false,
              config.tokenDecimal
            ),
          ]);
        }

        if (!updateLimitParams.length) return;

        let contract: Contract;
        if (addr[SuperTokenContracts.SuperToken]) {
          contract = await getInstance(
            SuperTokenContracts.SuperToken,
            addr[SuperTokenContracts.SuperToken]
          );
        } else if (addr[SuperTokenContracts.Vault]) {
          contract = await getInstance(
            SuperTokenContracts.Vault,
            addr[SuperTokenContracts.Vault]
          );
        } else throw new Error(`Not a super token address config, ${addr}`);

        contract = contract.connect(socketSigner);
        let tx = await contract.updateLimitParams(updateLimitParams, {
          ...overrides[chain],
        });
        console.log(chain, tx.hash);
        await tx.wait();

        console.log(`Setting vault limits for ${chain} - COMPLETED`);
      })
    );
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const connect = async (
  addresses: SuperTokenAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log("connecting plugs for ", chain, siblingSlugs);

    const localPlug = addresses[chain][SuperTokenContracts.SocketPlug];
    const socketContract: Contract = getSocket(chain, socketSigner);

    if (!localPlug) return;

    for (let sibling of siblingSlugs) {
      const siblingPlug: string | undefined =
        addresses?.[sibling]?.[SuperTokenContracts.SocketPlug];
      if (!siblingPlug) continue;

      // connect socket
      const switchboard = getAddresses(chain, mode).integrations[sibling][
        config.integrationType
      ]?.switchboard;

      if (!switchboard) {
        console.log(
          `switchboard not found for ${chain}, ${sibling}, ${config.integrationType}`
        );
      }

      let plugConfig = await socketContract.getPlugConfig(localPlug, sibling);

      if (plugConfig[0].toLowerCase() === siblingPlug.toLowerCase()) {
        console.log("already set, confirming ", { plugConfig });
        continue;
      }

      const connectorContract = (
        await getInstance(SuperTokenContracts.SocketPlug, localPlug)
      ).connect(socketSigner);

      let tx = await connectorContract.functions["connect"](
        siblingPlug,
        switchboard,
        { ...overrides[chain] }
      );
      console.log(chain, tx.hash);
      await tx.wait();
    }
  } catch (error) {
    console.log("error while connecting plugs: ", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
