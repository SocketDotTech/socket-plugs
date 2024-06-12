import {
  createBatchFiles,
  getSuperBridgeAddresses,
  removeSafeTransactionsFile,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { ALL_ROLES, MINTER_ABI, OWNABLE_ABI, ROLE_ABI } from "../constants";
import {
  checkAndGrantRole,
  checkAndRevokeRole,
  getHookContract,
} from "../helpers/common";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";
import yargs from "yargs";

// Roles should be as follow:
// - RESCUE_ROLE: Vault, Controller, Hook, Connector
// - LIMIT_UPDATER_ROLE: Hook
// - SOCKET_RELAYER_ROLE: Connector
// - MINTER_ROLE: Token (only on Kinto, only Controller

// This script will grant the corresponding roles on the corresponding Socket contracts to the corresponding Safe addresses (or Kinto owner address on Kinto chain).
// It will also revoke the roles on the owner address (hot wallet).

const OWNER_ADDRESS: string = process.env.OWNER_ADDRESS; // address to make sure roles are not granted to
if (OWNER_ADDRESS.length === 0) {
  console.error(
    "Please provide an address to make sure roles are not granted to"
  );
  process.exit(1);
}

const chainToExpectedRoleGrantees = {
  [ChainSlug.KINTO]: process.env.KINTO_OWNER_ADDRESS,
  [ChainSlug.ARBITRUM]: process.env.ARBITRUM_SAFE,
  [ChainSlug.BASE]: process.env.BASE_SAFE,
  [ChainSlug.MAINNET]: process.env.MAINNET_SAFE,
  // [ChainSlug.OPTIMISM]: process.env.OPTIMISM_SAFE,
};

// check if expected owner is not null
for (const chain of Object.keys(chainToExpectedRoleGrantees)) {
  if (!chainToExpectedRoleGrantees[+chain]) {
    console.error(`Expected owner not found for chain ${chain}`);
    throw new Error(`Expected owner not found for chain ${chain}`);
  }
}

const processRole = async (
  contract: ethers.Contract,
  role: string,
  chain: string
) => {
  // grant role to safe or kinto admin
  await checkAndGrantRole(
    parseInt(chain),
    contract,
    role,
    ALL_ROLES[role],
    chainToExpectedRoleGrantees[+chain]
  );

  // revoke role on owner address
  await checkAndRevokeRole(
    parseInt(chain),
    contract,
    role,
    ALL_ROLES[role],
    OWNER_ADDRESS
  );
};

const argv = yargs
  .options({
    token: { type: "string", demandOption: false },
    "chain-id": { type: "number", demandOption: false },
  })
  .example(
    "npx ts-node script/admin/change-roles.ts DAI 1",
    "Change roles for DAI token on chain 1"
  )
  .example(
    "npx ts-node script/admin/change-roles.ts DAI",
    "Change roles for DAI token on all chains"
  )
  .example(
    "npx ts-node script/admin/change-roles.ts",
    "Change roles for all tokens on all chains"
  )
  .help().argv;

export const main = async () => {
  const ABI = [...ROLE_ABI, ...OWNABLE_ABI, ...MINTER_ABI];
  removeSafeTransactionsFile();
  try {
    const addresses = await getSuperBridgeAddresses();
    const chainId = argv["chain-id"];
    const tokenParam = argv["token"];

    for (const chain of Object.keys(addresses)) {
      if (chainId && +chain !== chainId) continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (token && token !== tokenParam) continue;
        console.log(`\nChecking addresses for token ${token}`);
        for (const role of ["RESCUE_ROLE"]) {
          if (isSBAppChain(+chain, token)) {
            const controllerAddress = addresses[chain][token].Controller;
            const controllerContract = new ethers.Contract(
              controllerAddress,
              ABI,
              getSignerFromChainSlug(+chain)
            );
            await processRole(controllerContract, role, chain);

            // grant MINTER_ROLE on the token contract to the controller
            const tokenAddress = addresses[chain][token].MintableToken;
            await checkAndGrantRole(
              parseInt(chain),
              new ethers.Contract(
                tokenAddress,
                ABI,
                getSignerFromChainSlug(+chain)
              ),
              "MINTER_ROLE",
              ALL_ROLES["MINTER_ROLE"],
              controllerContract.address
            );
          } else {
            // Vault
            const vaultAddress = addresses[chain][token].Vault;
            const vaultContract = new ethers.Contract(
              vaultAddress,
              ABI,
              getSignerFromChainSlug(+chain)
            );
            await processRole(vaultContract, role, chain);
          }
        }

        for (const role of ["LIMIT_UPDATER_ROLE", "RESCUE_ROLE"]) {
          let { hookContract, hookContractName } = await getHookContract(
            chain as unknown as ChainSlug,
            token as unknown as Tokens,
            isSBAppChain(+chain, token)
              ? addresses[chain][token]
              : (addresses[chain][token] as unknown as
                  | SBTokenAddresses
                  | STTokenAddresses)
          );
          if (hookContract) {
            await processRole(hookContract, role, chain);
          }
        }

        for (const role of ["RESCUE_ROLE"]) {
          for (const connectorChain of Object.keys(
            addresses[chain][token].connectors
          )) {
            for (const connectorType of Object.keys(
              addresses[chain][token].connectors[connectorChain]
            )) {
              const connectorAddress =
                addresses[chain][token].connectors[connectorChain][
                  connectorType
                ];
              const contract = new ethers.Contract(
                connectorAddress,
                ABI,
                getSignerFromChainSlug(+chain)
              );
              await processRole(contract, role, chain);
            }
          }
        }
      }
    }
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
  createBatchFiles();
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
