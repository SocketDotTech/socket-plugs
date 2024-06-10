import { getRoleMembers, getSuperBridgeAddresses } from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { ALL_ROLES } from "../constants";
import { getHookContract } from "../helpers/common";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";
import { ROLE_ABI, ROLE_BRIDGED_TOKEN_ABI } from "../constants/abis/role";

export const main = async () => {
  try {
    const addresses = await getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        console.log(`\nChecking addresses for token ${token}`);
        for (const role of Object.keys(ALL_ROLES)) {
          if (isSBAppChain(+chain, token)) {
            const controllerAddress = addresses[chain][token].Controller;
            const controllerContract = new ethers.Contract(
              controllerAddress,
              ROLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            const members = await getRoleMembers(
              controllerContract,
              ALL_ROLES[role]
            );
            console.log(
              `Addresses with ${role} for Controller contract: ${controllerAddress} are [${members.toString()}]`
            );

            const tokenContract = new ethers.Contract(
              addresses[chain][token].MintableToken,
              ROLE_BRIDGED_TOKEN_ABI,
              getSignerFromChainSlug(+chain)
            );
            const tokenMembers = await getRoleMembers(
              tokenContract,
              ALL_ROLES[role]
            );
            console.log(
              `Addresses with ${role} for ${token} contract: ${
                addresses[chain][token].MintableToken
              } are [${tokenMembers.toString()}]`
            );
          } else {
            // Vault
            const vaultAddress = addresses[chain][token].Vault;
            const vaultContract = new ethers.Contract(
              vaultAddress,
              ROLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            const members = await getRoleMembers(
              vaultContract,
              ALL_ROLES[role]
            );
            console.log(
              `Addresses with ${role} for Vault contract: ${vaultAddress} are [${members.toString()}]`
            );
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
            const members = await getRoleMembers(hookContract, ALL_ROLES[role]);
            console.log(
              `Addresses with ${role} for ${hookContractName} contract: ${
                hookContract.address
              } are [${members.toString()}]`
            );
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
                ROLE_ABI,
                getSignerFromChainSlug(+chain)
              );
              const members = await getRoleMembers(contract, ALL_ROLES[role]);
              console.log(
                `Addresses with ${role} for Connector contract: ${connectorAddress} are [${members.toString()}]`
              );
            }
          }
        }
      }
    }
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
