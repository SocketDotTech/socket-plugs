import {
  getOwnerAndNominee,
  getSuperBridgeAddresses,
  getSuperTokenAddresses,
  ZERO_ADDRESS,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { OWNABLE_ABI } from "../constants/abis/ownable";
import { HookContracts, SBAddresses, STAddresses } from "../../src";

async function checkAddresses(addresses: SBAddresses | STAddresses) {
  for (const chain of Object.keys(addresses)) {
    console.log(`\nChecking addresses for chain ${chain}`);
    for (const token of Object.keys(addresses[chain])) {
      if (isSBAppChain(+chain, token)) {
        const controllerAddress = addresses[chain][token].Controller;
        const controllerContract = new ethers.Contract(
          controllerAddress,
          OWNABLE_ABI,
          getSignerFromChainSlug(+chain)
        );
        const [controllerOwner, controllerNominee, type] =
          await getOwnerAndNominee(controllerContract);
        console.log(
          `Owner of ${controllerAddress}(${type}) is ${controllerOwner}${
            controllerNominee === ZERO_ADDRESS
              ? ""
              : ` (nominee: ${controllerNominee})`
          } on chain: ${chain} (Controller for token: ${token})`
        );
      } else {
        // Vault
        const vaultAddress = addresses[chain][token].Vault;
        const vaultContract = new ethers.Contract(
          vaultAddress,
          OWNABLE_ABI,
          getSignerFromChainSlug(+chain)
        );
        const [vaultOwner, vaultNominee, type] = await getOwnerAndNominee(
          vaultContract
        );
        console.log(
          `Owner of ${vaultAddress}(${type}) is ${vaultOwner}${
            vaultNominee === ZERO_ADDRESS ? "" : ` (nominee: ${vaultNominee})`
          } on chain: ${chain} (Vault for token: ${token})`
        );
      }

      const hooks = Object.values(HookContracts);
      const hookContract = hooks
        .map((hook) => addresses[chain][token][hook])
        .filter(Boolean)[0];

      if (!hookContract) {
        console.error(`Hook contract not found for chain ${chain} ${token}`);
      } else {
        const [hookOwner, hookNominee, hookType] = await getOwnerAndNominee(
          new ethers.Contract(
            hookContract,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          )
        );
        console.log(
          `Owner of ${hookContract}(${hookType}) is ${hookOwner}${
            hookNominee === ZERO_ADDRESS ? "" : ` (nominee: ${hookNominee})`
          } on chain: ${chain} (Hook for ${token})`
        );
      }

      for (const connectorChain of Object.keys(
        addresses[chain][token].connectors
      )) {
        for (const connectorType of Object.keys(
          addresses[chain][token].connectors[connectorChain]
        )) {
          const connectorAddress =
            addresses[chain][token].connectors[connectorChain][connectorType];
          const contract = new ethers.Contract(
            connectorAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [owner, nominee, type] = await getOwnerAndNominee(contract);
          console.log(
            `Owner of ${connectorAddress}(${type}) is ${owner}${
              nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
            } on chain: ${chain} (Connector for ${token}, conn-chain: ${connectorChain}, conn-type: ${connectorType}`
          );
        }
      }
    }
  }
}

export const main = async () => {
  try {
    console.log("\n== SuperBridge Addresses ==\n");
    await checkAddresses(getSuperBridgeAddresses());
    console.log("\n== SuperToken Addresses ==\n");
    await checkAddresses(getSuperTokenAddresses());
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
