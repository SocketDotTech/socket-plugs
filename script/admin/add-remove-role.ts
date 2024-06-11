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
import { ChainSlug, ChainSlugToKey } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";

// Roles should be as follow:
// - RESCUE_ROLE: Vault, Controller, Hook, Connector
// - LIMIT_UPDATER_ROLE: Hook
// - SOCKET_RELAYER_ROLE: Connector
// - MINTER_ROLE: Token (only on Kinto, only Controller

// This script will grant the corresponding roles to the corresponding Socket contracts to a given address.
const GRANT: boolean = true; // set to true to grant roles, false to revoke roles
const USE_SAFE_OR_KINTO_ADMIN = true; // set to true to use Safe address instead of ADDRESS.
let ADDRESS: string = ""; // = "0x660ad4B5A74130a4796B4d54BC6750Ae93C86e6c"; // address to grant/revoke roles
if (ADDRESS.length === 0) {
  console.error("Please provide an address to grant/revoke roles");
  process.exit(1);
}

export const main = async () => {
  const ABI = [...ROLE_ABI, ...OWNABLE_ABI, ...MINTER_ABI];
  removeSafeTransactionsFile();
  try {
    const addresses = await getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      ADDRESS = USE_SAFE_OR_KINTO_ADMIN
        ? chain === "7887"
          ? process.env.KINTO_OWNER_ADDRESS
          : process.env[ChainSlugToKey[chain].toUpperCase() + "_SAFE"]
        : ADDRESS;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        console.log(`\nChecking addresses for token ${token}`);
        for (const role of ["RESCUE_ROLE"]) {
          if (isSBAppChain(+chain, token)) {
            const controllerAddress = addresses[chain][token].Controller;
            const controllerContract = new ethers.Contract(
              controllerAddress,
              ABI,
              getSignerFromChainSlug(+chain)
            );

            // grant/revoke role if needed
            if (GRANT) {
              await checkAndGrantRole(
                parseInt(chain),
                controllerContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                controllerContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            }

            // grant/revoke MINTER_ROLE on the token contract to the controller
            const tokenAddress = addresses[chain][token].MintableToken;
            if (GRANT) {
              await checkAndGrantRole(
                parseInt(chain),
                new ethers.Contract(
                  tokenAddress,
                  ABI,
                  getSignerFromChainSlug(+chain)
                ),
                role,
                "MINTER_ROLE",
                controllerContract.address
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                new ethers.Contract(
                  tokenAddress,
                  ABI,
                  getSignerFromChainSlug(+chain)
                ),
                role,
                "MINTER_ROLE",
                controllerContract.address
              );
            }
          } else {
            // Vault
            const vaultAddress = addresses[chain][token].Vault;
            const vaultContract = new ethers.Contract(
              vaultAddress,
              ABI,
              getSignerFromChainSlug(+chain)
            );

            if (GRANT) {
              await checkAndGrantRole(
                parseInt(chain),
                vaultContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                vaultContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            }
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
            if (GRANT) {
              await checkAndGrantRole(
                parseInt(chain),
                hookContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                hookContract,
                role,
                ALL_ROLES[role],
                ADDRESS
              );
            }
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
              if (GRANT) {
                await checkAndGrantRole(
                  parseInt(chain),
                  contract,
                  role,
                  ALL_ROLES[role],
                  ADDRESS
                );
              } else {
                await checkAndRevokeRole(
                  parseInt(chain),
                  contract,
                  role,
                  ALL_ROLES[role],
                  ADDRESS
                );
              }
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
