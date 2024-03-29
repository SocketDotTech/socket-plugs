import { BigNumber, Contract, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
} from "@socket.tech/dl-core";

import { getSignerFromChainSlug, overrides } from "../../helpers/networks";
import {
  getInstance,
  getProjectAddresses,
  getPoolIdHex,
} from "../../helpers/utils";
import {
  getProjectTokenConstants,
  getLimitBN,
  getRateBN,
  isAppChain,
} from "../../helpers/constants";
import { getSocket } from "../../bridge/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  ConnectorAddresses,
  Connectors,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
} from "../../../src";
import { getDryRun, getMode, getToken } from "../../constants/config";
import { ProjectTokenConstants } from "../../constants/types";

type UpdateLimitParams = [
  boolean,
  string,
  string | number | BigNumber,
  string | number | BigNumber
];

let pc: ProjectTokenConstants;

const execSummary = [];

async function execute(
  contract: Contract,
  method: string,
  args: any[],
  chain: number
) {
  if (getDryRun()) {
    execSummary.push("");
    execSummary.push(
      `DRY RUN - Call '${method}' on ${contract.address} on chain ${chain} with args:`
    );
    args.forEach((a) => execSummary.push(a));
    execSummary.push(
      "RAW CALLDATA - " +
        (await contract.populateTransaction[method](...args)).data
    );
    execSummary.push("");
  } else {
    let tx = await contract.functions[method](...args, {
      ...overrides[chain],
    });
    console.log(`o   Sent on chain: ${chain} txHash: ${tx.hash}`);
    await tx.wait();
  }
}

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    pc = getProjectTokenConstants();

    const nonAppChainsList: ChainSlug[] = Object.keys(pc.nonAppChains).map(
      (k) => parseInt(k)
    );
    await Promise.all(
      [pc.appChain, ...nonAppChainsList].map(async (chain) => {
        const addr: TokenAddresses | undefined = addresses[chain]?.[getToken()];
        const connectors: Connectors | undefined = addr?.connectors;
        if (!addr || !connectors) return;

        const socketSigner = getSignerFromChainSlug(chain);

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];

        await connect(addr, addresses, chain, siblingSlugs, socketSigner);

        console.log(
          `-   Checking limits and pool ifs for chain ${chain}, siblings ${siblingSlugs}`
        );
        let contract: Contract;
        if (addr.isAppChain) {
          const a = addr as AppChainAddresses;
          if (!a.Controller) {
            console.error("Controller not found");
            return;
          }
          contract = await getInstance(
            SuperBridgeContracts.Controller,
            a.Controller
          );
        } else {
          const a = addr as NonAppChainAddresses;
          if (!a.Vault) {
            console.error("Vault not found");
            return;
          }
          contract = await getInstance(SuperBridgeContracts.Vault, a.Vault);
        }

        contract = contract.connect(socketSigner);

        const updateLimitParams: UpdateLimitParams[] = [];
        const connectorAddresses: string[] = [];
        const connectorPoolIds: string[] = [];

        for (let sibling of siblingSlugs) {
          const siblingConnectorAddresses: ConnectorAddresses | undefined =
            connectors[sibling];
          if (!siblingConnectorAddresses) continue;

          const integrationTypes: IntegrationTypes[] = Object.keys(
            siblingConnectorAddresses
          ) as unknown as IntegrationTypes[];
          for (let it of integrationTypes) {
            const itConnectorAddress: string | undefined =
              siblingConnectorAddresses[it];
            if (!itConnectorAddress) continue;

            let lockParams;
            if (addr.isAppChain) {
              lockParams = await contract.functions.getMintLimitParams(
                itConnectorAddress
              );
            } else {
              lockParams = await contract.functions.getLockLimitParams(
                itConnectorAddress
              );
            }

            let unlockParams;
            if (addr.isAppChain) {
              unlockParams = await contract.functions.getBurnLimitParams(
                itConnectorAddress
              );
            } else {
              unlockParams = await contract.functions.getUnlockLimitParams(
                itConnectorAddress
              );
            }

            // mint/lock/deposit limits
            const mintLimit = getLimitBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              true
            );
            const mintRate = getRateBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              true
            );

            if (
              !mintLimit.eq(lockParams[0]["maxLimit"]) ||
              !mintRate.eq(lockParams[0]["ratePerSecond"])
            ) {
              updateLimitParams.push([
                true,
                itConnectorAddress,
                mintLimit,
                mintRate,
              ]);
            } else {
              console.log(
                `✔   Deposit limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
              );
            }

            // burn/unlock/withdraw limits
            const burnLimit = getLimitBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              false
            );
            const burnRate = getRateBN(
              it,
              isAppChain(sibling) ? chain : sibling,
              false
            );

            if (
              !burnLimit.eq(unlockParams[0]["maxLimit"]) ||
              !burnRate.eq(unlockParams[0]["ratePerSecond"])
            ) {
              updateLimitParams.push([
                false,
                itConnectorAddress,
                burnLimit,
                burnRate,
              ]);
            } else {
              console.log(
                `✔   Withdraw limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
              );
            }

            if (
              chain === pc.appChain &&
              chain !== ChainSlug.AEVO &&
              chain !== ChainSlug.AEVO_TESTNET
            ) {
              const poolId: BigNumber = await contract.connectorPoolIds(
                itConnectorAddress
              );
              const poolIdHex =
                "0x" + BigInt(poolId.toString()).toString(16).padStart(64, "0");

              if (poolIdHex !== getPoolIdHex(sibling, it)) {
                connectorAddresses.push(itConnectorAddress);
                connectorPoolIds.push(getPoolIdHex(sibling, it));
              } else {
                console.log(
                  `✔   Pool id already set for chain ${chain}, sibling ${sibling}, integration ${it}`
                );
              }
            }
          }
        }

        if (!updateLimitParams.length) return;

        await execute(
          contract,
          "updateLimitParams",
          [updateLimitParams],
          chain
        );

        if (
          addr.isAppChain &&
          connectorAddresses.length &&
          connectorPoolIds.length
        ) {
          await execute(
            contract,
            "updateConnectorPoolId",
            [connectorAddresses, connectorPoolIds],
            chain
          );
        }
      })
    );

    if (execSummary.length) {
      console.log("=".repeat(100));
      execSummary.forEach((t) => console.log(t));
      console.log("=".repeat(100));
    }
  } catch (error) {
    console.error("Error while sending transaction", error);
  }
};

const connect = async (
  addr: TokenAddresses,
  addresses: ProjectAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet
) => {
  try {
    console.log(
      `-   Checking connection for chain ${chain}, siblings ${siblingSlugs}`
    );

    for (let sibling of siblingSlugs) {
      const localConnectorAddresses: ConnectorAddresses | undefined =
        addr.connectors?.[sibling];
      const siblingConnectorAddresses: ConnectorAddresses | undefined =
        addresses?.[sibling]?.[getToken()]?.connectors?.[chain];
      if (!localConnectorAddresses || !siblingConnectorAddresses) continue;

      const integrationTypes: IntegrationTypes[] = Object.keys(
        localConnectorAddresses
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);
      for (let integration of integrationTypes) {
        const siblingConnectorPlug = siblingConnectorAddresses[integration];
        const localConnectorPlug = localConnectorAddresses[integration];
        if (!localConnectorPlug || !siblingConnectorPlug) continue;

        const switchboard = getAddresses(chain, getMode()).integrations[
          sibling
        ][integration]?.switchboard;

        if (!switchboard) {
          console.log(
            `switchboard not found for ${chain}, ${sibling}, ${integration}`
          );
        }

        let config = await socketContract.getPlugConfig(
          localConnectorPlug,
          sibling
        );

        if (config[0].toLowerCase() === siblingConnectorPlug.toLowerCase()) {
          console.log(`✔   Already connected ${chain}, ${sibling}`);
          continue;
        }

        const connectorContract = (
          await getInstance(
            SuperBridgeContracts.ConnectorPlug,
            localConnectorPlug
          )
        ).connect(socketSigner);

        await execute(
          connectorContract,
          "connect",
          [siblingConnectorPlug, switchboard],
          chain
        );
      }
    }
  } catch (error) {
    console.error("error while configuring: ", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
