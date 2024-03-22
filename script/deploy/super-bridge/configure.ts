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
  HookContracts,
} from "../../../src";
import { getDryRun, getMode, getToken } from "../../constants/config";
import { ProjectTokenConstants } from "../../constants/types";
import { LIMIT_UPDATER_ROLE } from "../../constants/roles";

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
    console.log(
      `o   Sent on chain: ${chain} function: ${method} txHash: ${tx.hash}`
    );
    await tx.wait();
  }
}

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    pc = getProjectTokenConstants();

    const nonAppChainsList: ChainSlug[] = pc.nonAppChains;
    await Promise.all(
      [pc.appChain, ...nonAppChainsList].map(async (chain) => {
        const addr: TokenAddresses | undefined = addresses[chain]?.[getToken()];
        const connectors: Connectors | undefined = addr?.connectors;
        if (!addr || !connectors) return;

        const socketSigner = getSignerFromChainSlug(chain);

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];

        let hubContract: Contract;
        if (addr.isAppChain) {
          hubContract = await getInstance(
            SuperBridgeContracts.Controller,
            addr[SuperBridgeContracts.Controller]
          );
        } else {
          hubContract = await getInstance(
            SuperBridgeContracts.Vault,
            addr[SuperBridgeContracts.Vault]
          );
        }

        hubContract = hubContract.connect(socketSigner);

        await connect(addr, addresses, chain, siblingSlugs, socketSigner);
        await updateConnectorStatus(
          chain,
          siblingSlugs,
          addr,
          connectors,
          hubContract
        );

        console.log(
          `-   Checking limits and pool ids for chain ${chain}, siblings ${siblingSlugs}`
        );
        let hookContract: Contract;

        if (addr[HookContracts.LimitHook]) {
          hookContract = await getInstance(
            HookContracts.LimitHook,
            addr[HookContracts.LimitHook]
          );
        }
        if (addr[HookContracts.LimitExecutionHook]) {
          hookContract = await getInstance(
            HookContracts.LimitExecutionHook,
            addr[HookContracts.LimitExecutionHook]
          );

          await setHookInExecutionHelper(
            chain,
            socketSigner,
            hookContract,
            addr
          );
        }

        if (!hookContract) {
          console.log("Hook not found for chain: ", chain);
          return;
        }

        // console.log("Hook contract: ", hookContract.address);
        hookContract = hookContract.connect(socketSigner);

        await setHookInHub(chain, hubContract, hookContract);

        await updateLimitsAndPoolId(
          chain,
          siblingSlugs,
          addr,
          connectors,
          hookContract
        );
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

const setHookInHub = async (
  chain: ChainSlug,
  hubContract: Contract,
  hookContract: Contract
) => {
  let storedHookAddress = await hubContract.hook__();
  if (storedHookAddress === hookContract.address) {
    console.log(`✔   Hook already set on Hub for chain ${chain}`);
    return;
  }
  {
    console.log(
      "stored address in Hub: ",
      storedHookAddress,
      "hookContract: ",
      hookContract.address
    );
  }
  await execute(
    hubContract,
    "updateHook",
    [hookContract.address, false],
    chain
  );
};

const setHookInExecutionHelper = async (
  chain: ChainSlug,
  socketSigner: Wallet,
  hookContract: Contract,
  addr: TokenAddresses
) => {
  let executionHelperContract = await getInstance(
    HookContracts.ExecutionHelper,
    addr[HookContracts.ExecutionHelper]
  );
  executionHelperContract = executionHelperContract.connect(socketSigner);

  let storedHookAddress = await executionHelperContract.hook();
  if (storedHookAddress === hookContract.address) {
    console.log(`✔   Hook already set on Execution Helper for chain ${chain}`);
    return;
  }
  {
    console.log(
      "stored address in EH: ",
      storedHookAddress,
      "hookContract: ",
      hookContract.address
    );
  }

  await execute(
    executionHelperContract,
    "setHook",
    [hookContract.address],
    chain
  );
};

const updateConnectorStatus = async (
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  addr: TokenAddresses,
  connectors: Connectors,
  hubContract: Contract
) => {
  const connectorAddresses: string[] = [];

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

      // console.log(
      //   { itConnectorAddress, chain, sibling, connectors },
      //   hubContract.address,
      //   hubContract.validConnectors
      // );
      let connectorStatus = await hubContract.callStatic.validConnectors(
        itConnectorAddress
      );
      if (!connectorStatus) {
        connectorAddresses.push(itConnectorAddress);
      }
    }
  }
  if (connectorAddresses.length) {
    await execute(
      hubContract,
      "updateConnectorStatus",
      [connectorAddresses, new Array(connectorAddresses.length).fill(true)],
      chain
    );
  } else {
    console.log(`✔   Connector status already set for chain ${chain}`);
  }
};

const updateLimitsAndPoolId = async (
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  addr: TokenAddresses,
  connectors: Connectors,
  hookContract: Contract
) => {
  const updateLimitParams: UpdateLimitParams[] = [];
  const connectorAddresses: string[] = [];
  const connectorPoolIds: string[] = [];
  // console.log({ chain, siblingSlugs, addr, connectors });

  let hasRole = await hookContract.hasRole(
    LIMIT_UPDATER_ROLE,
    hookContract.signer.getAddress()
  );
  if (!hasRole) {
    console.log(
      "Adding limit updater role to signer",
      hookContract.signer.getAddress(),
      " on chain : ",
      chain
    );
    await execute(
      hookContract,
      "grantRole",
      [LIMIT_UPDATER_ROLE, hookContract.signer.getAddress()],
      chain
    );
  } else {
    console.log("✔   Limit updater role already set on hook for chain ", chain);
  }
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
      // console.log({ itConnectorAddress });
      let sendingParams = await hookContract.getSendingLimitParams(
        itConnectorAddress
      );

      // console.log({ sendingParams });
      let receivingParams = await hookContract.getReceivingLimitParams(
        itConnectorAddress
      );

      // mint/lock/deposit limits
      const sendingLimit = getLimitBN(
        it,
        isAppChain(sibling) ? chain : sibling,
        true
      );
      const sendingRate = getRateBN(
        it,
        isAppChain(sibling) ? chain : sibling,
        true
      );
      if (
        !sendingLimit.eq(sendingParams["maxLimit"]) ||
        !sendingRate.eq(sendingParams["ratePerSecond"])
      ) {
        updateLimitParams.push([
          true,
          itConnectorAddress,
          sendingLimit,
          sendingRate,
        ]);
      } else {
        console.log(
          `✔   Sending limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
        );
      }

      const receivingLimit = getLimitBN(
        it,
        isAppChain(sibling) ? chain : sibling,
        false
      );
      const receivingRate = getRateBN(
        it,
        isAppChain(sibling) ? chain : sibling,
        false
      );

      if (
        !receivingLimit.eq(receivingParams["maxLimit"]) ||
        !receivingRate.eq(receivingParams["ratePerSecond"])
      ) {
        updateLimitParams.push([
          false,
          itConnectorAddress,
          receivingLimit,
          receivingRate,
        ]);
      } else {
        console.log(
          `✔   Receiving limit already set for chain ${chain}, sibling ${sibling}, integration ${it}`
        );
      }

      if (
        chain === pc.appChain
        // chain !== ChainSlug.AEVO &&
        // chain !== ChainSlug.AEVO_TESTNET
      ) {
        const poolId: BigNumber = await hookContract.connectorPoolIds(
          itConnectorAddress
        );
        console.log({ itConnectorAddress, poolId });
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

  if (updateLimitParams.length) {
    await execute(
      hookContract,
      "updateLimitParams",
      [updateLimitParams],
      chain
    );
  }

  if (addr.isAppChain && connectorAddresses.length && connectorPoolIds.length) {
    await execute(
      hookContract,
      "updateConnectorPoolId",
      [connectorAddresses, connectorPoolIds],
      chain
    );
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
        // console.log(
        //   { localConnectorPlug, sibling, switchboard },
        //   socketContract.address
        // );
        let config = await socketContract.callStatic.getPlugConfig(
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
