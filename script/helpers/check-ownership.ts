import { getOwnerAndNominee, getProjectAddresses, ZERO_ADDRESS } from "./utils";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "./networks";
import { isAppChain } from "./constants";
import { OWNABLE_ABI } from "../constants/abis/ownable";

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    for (const chain of Object.keys(addresses)) {
      if (chain === "default") continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (isAppChain(+chain)) {
          // ExchangeRate and Controller
          const exchangeRateAddress = addresses[chain][token].ExchangeRate;
          const exchangeRateContract = new ethers.Contract(
            exchangeRateAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [exchangeRateOwner, exchangeRateNominee, exchangeRateType] =
            await getOwnerAndNominee(exchangeRateContract);
          console.log(
            `Owner of ${exchangeRateAddress}(${exchangeRateType}) is ${exchangeRateOwner}${
              exchangeRateNominee === ZERO_ADDRESS
                ? ""
                : ` (nominee: ${exchangeRateNominee})`
            } on chain: ${chain} (ExchangeRate for token: ${token})`
          );

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
