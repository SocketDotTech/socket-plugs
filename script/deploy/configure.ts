import { BigNumber, Contract, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
} from "@socket.tech/dl-core";

import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import {
  getInstance,
  getSuperBridgeAddresses,
  getPoolIdHex,
  getSuperTokenAddresses,
  getSocket,
} from "../helpers/utils";
import {
  getBridgeProjectTokenConstants,
  getLimitBN,
  getRateBN,
  isAppChain,
  getSuperTokenConstants,
} from "../helpers/projectConstants";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  ConnectorAddresses,
  Connectors,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
  HookContracts,
  SuperTokenChainAddresses,
  SuperTokenProjectAddresses,
  ProjectType,
  SuperTokenContracts,
  TokenContracts,
} from "../../src";
import {
  getDryRun,
  getMode,
  getProjectType,
  getToken,
  isSuperBridge,
  isSuperToken,
} from "../constants/config";
import { ProjectTokenConstants } from "../constants/types";
import {
  CONTROLLER_ROLE,
  LIMIT_UPDATER_ROLE,
  RESCUE_ROLE,
} from "../constants/roles";

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
let socketSignerAddress: string;

export const main = async () => {
  try {
    let projectType = getProjectType();
    let addresses: ProjectAddresses | SuperTokenProjectAddresses;
    if (isSuperBridge()) {
      addresses = await getSuperBridgeAddresses();
      pc = getBridgeProjectTokenConstants();
    } else if (isSuperToken()) {
      addresses = await getSuperTokenAddresses();
      pc = getSuperTokenConstants();
    }

    const allChains = isSuperBridge()
      ? [pc.appChain, ...pc.nonAppChains]
      : [...pc.vaultChains, ...pc.superTokenChains];

    await Promise.all(
      allChains.map(async (chain) => {
        let addr: TokenAddresses | SuperTokenChainAddresses | undefined;
        if (isSuperBridge())
          addr = addresses[chain]?.[getToken()] as TokenAddresses;
        else addr = addresses[chain] as SuperTokenChainAddresses;

        const connectors: Connectors | undefined = addr?.connectors;
        if (!addr || !connectors) return;

        const socketSigner = getSignerFromChainSlug(chain);
        socketSignerAddress = await socketSigner.getAddress();

        let siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
          parseInt(k)
        ) as ChainSlug[];

        let hubContract: Contract;
        if (addr["Controller"]) {
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
        await setRescueRoleForAllContracts(chain, socketSigner, addr);
        console.log(
          `-   Checking limits and pool ids for chain ${chain}, siblings ${siblingSlugs}`
        );

        if (addr[TokenContracts.SuperToken]) {
          let superTokenContract = await getInstance(
            TokenContracts.SuperToken,
            addr[TokenContracts.SuperToken]
          );
          superTokenContract = superTokenContract.connect(socketSigner);

          await setControllerRole(
            chain,
            superTokenContract,
            hubContract.address
          );
        }
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
  addr: TokenAddresses | SuperTokenChainAddresses
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
  addr: TokenAddresses | SuperTokenChainAddresses,
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

const checkAndGrantRole = async (
  chain: ChainSlug,
  contract: Contract,
  roleName: string,
  roleHash: string,
  userAddress = socketSignerAddress
) => {
  let hasRole = await contract.hasRole(roleHash, userAddress);
  if (!hasRole) {
    console.log(
      `Adding ${roleName} role to signer`,
      userAddress,
      " for contract: ",
      contract.address,
      " on chain : ",
      chain
    );
    await execute(contract, "grantRole", [roleHash, userAddress], chain);
  } else {
    console.log(
      `✔ ${roleName} role already set on ${contract.address} for ${userAddress} on chain `,
      chain
    );
  }
};
const setLimitUpdaterRole = async (
  chain: ChainSlug,
  hookContract: Contract
) => {
  await checkAndGrantRole(
    chain,
    hookContract,
    "limit updater",
    LIMIT_UPDATER_ROLE
  );
};

const setControllerRole = async (
  chain: ChainSlug,
  superTokenContract: Contract,
  controllerAddress: string
) => {
  await checkAndGrantRole(
    chain,
    superTokenContract,
    "controller",
    CONTROLLER_ROLE,
    controllerAddress
  );
};

const setRescueRole = async (chain: ChainSlug, contract: Contract) => {
  await checkAndGrantRole(chain, contract, "rescue", RESCUE_ROLE);
};

const setRescueRoleForAllContracts = async (
  chain: ChainSlug,
  socketSigner: Wallet,
  addr: TokenAddresses | SuperTokenChainAddresses
) => {
  let finalAddresses: (string | undefined)[] = [],
    contractAddresses: string[] = [];
  contractAddresses.push(addr[SuperBridgeContracts.Controller]);
  contractAddresses.push(addr[SuperBridgeContracts.Vault]);
  contractAddresses.push(addr[SuperTokenContracts.SuperToken]);
  contractAddresses.push(addr[HookContracts.LimitHook]);
  contractAddresses.push(addr[HookContracts.LimitExecutionHook]);
  contractAddresses.push(addr[HookContracts.ExecutionHelper]);
  let siblings = Object.keys(addr.connectors);
  for (let sibling of siblings) {
    let connectorAddresses = addr.connectors[sibling];
    if (!connectorAddresses) continue;
    let integrationTypes = Object.keys(connectorAddresses);
    for (let it of integrationTypes) {
      contractAddresses.push(connectorAddresses[it]);
    }
  }

  console.log({ contractAddresses });
  for (let contractAddress of contractAddresses) {
    if (!contractAddress) continue;
    let contract = await getInstance(
      SuperBridgeContracts.Controller,
      contractAddress
    );
    contract = contract.connect(socketSigner);
    await setRescueRole(chain, contract);
  }
};

const updateLimitsAndPoolId = async (
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  addr: TokenAddresses | SuperTokenChainAddresses,
  connectors: Connectors,
  hookContract: Contract
) => {
  const updateLimitParams: UpdateLimitParams[] = [];
  const connectorAddresses: string[] = [];
  const connectorPoolIds: string[] = [];
  // console.log({ chain, siblingSlugs, addr, connectors });

  await setLimitUpdaterRole(chain, hookContract);

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
      const sendingLimit = getLimitBN(it, chain, true);
      const sendingRate = getRateBN(it, chain, true);
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

      const receivingLimit = getLimitBN(it, chain, false);
      const receivingRate = getRateBN(it, chain, false);

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
        // console.log({ itConnectorAddress, poolId });
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
  if (pc.projectType === ProjectType.SUPERTOKEN) return;
  let addresses = addr as TokenAddresses;
  if (
    addresses.isAppChain &&
    connectorAddresses.length &&
    connectorPoolIds.length
  ) {
    await execute(
      hookContract,
      "updateConnectorPoolId",
      [connectorAddresses, connectorPoolIds],
      chain
    );
  }
};

const connect = async (
  addr: TokenAddresses | SuperTokenChainAddresses,
  addresses: ProjectAddresses | SuperTokenProjectAddresses,
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
        isSuperBridge()
          ? addresses?.[sibling]?.[getToken()]?.connectors?.[chain]
          : addresses?.[sibling]?.["connectors"]?.[chain];
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
