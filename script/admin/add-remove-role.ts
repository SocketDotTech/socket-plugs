import {
  createBatchFiles,
  getSuperBridgeAddresses,
  removeSafeTransactionsFile,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { ALL_ROLES, OWNABLE_ABI, ROLE_ABI } from "../constants";
import {
  checkAndGrantRole,
  checkAndRevokeRole,
  getHookContract,
} from "../helpers/common";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";

// this script will grant or revoke all existing roles from a given address on all the existing contracts
const GRANT: boolean = false; // set to true to grant roles, false to revoke roles
const ADDRESS: string = ""; // = "0x660ad4B5A74130a4796B4d54BC6750Ae93C86e6c"; // address to grant/revoke roles
if (ADDRESS.length === 0) {
  console.error("Please provide an address to grant/revoke roles");
  process.exit(1);
}

const TOKEN: string = ""; // = "wUSDM"; // token to grant/revoke roles [OPTIONAL]
const CHAIN: string = ""; // = "42161"; // chain to grant/revoke roles [OPTIONAL]

export const main = async () => {
  const ABI = [...ROLE_ABI, ...OWNABLE_ABI];
  removeSafeTransactionsFile();
  try {
    const addresses = await getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      if (CHAIN.length > 0 && chain !== CHAIN) continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (TOKEN.length > 0 && token !== TOKEN) continue;
        console.log(`\nChecking addresses for token ${token}`);
        for (const role of ALL_ROLES) {
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
                role.name,
                role.hash,
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                controllerContract,
                role.name,
                role.hash,
                ADDRESS
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
                role.name,
                role.hash,
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                vaultContract,
                role.name,
                role.hash,
                ADDRESS
              );
            }
          }

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
                role.name,
                role.hash,
                ADDRESS
              );
            } else {
              await checkAndRevokeRole(
                parseInt(chain),
                hookContract,
                role.name,
                role.hash,
                ADDRESS
              );
            }
          }

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
                  role.name,
                  role.hash,
                  ADDRESS
                );
              } else {
                await checkAndRevokeRole(
                  parseInt(chain),
                  contract,
                  role.name,
                  role.hash,
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
