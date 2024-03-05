import { getOwnerAndNominee, getProjectAddresses, OWNABLE_ABI, ZERO_ADDRESS } from "./utils";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "./networks";
import { isAppChain } from "./constants";


export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    for (const chain of Object.keys(addresses)) {
      if (chain === "default") continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const currency of Object.keys(addresses[chain])) {
        if (isAppChain(+chain)) {
          // ExchangeRate and Controller
          const exchangeRateAddress = addresses[chain][currency].ExchangeRate;
          const exchangeRateContract = new ethers.Contract(
            exchangeRateAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [exchangeRateOwner, exchangeRateNominee, exchangeRateType] =
            await getOwnerAndNominee(exchangeRateContract);
          console.log(
            `Owner of ${exchangeRateAddress} is ${exchangeRateOwner}${
              exchangeRateNominee === ZERO_ADDRESS
                ? ""
                : ` (nominee: ${exchangeRateNominee})`
            } on chain: ${chain} (ExchangeRate for currency: ${currency})`
          );

          const controllerAddress = addresses[chain][currency].Controller;
          const controllerContract = new ethers.Contract(
            controllerAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [controllerOwner, controllerNominee, ] =
            await getOwnerAndNominee(controllerContract);
          console.log(
            `Owner of ${controllerAddress} is ${controllerOwner}${
              controllerNominee === ZERO_ADDRESS
                ? ""
                : ` (nominee: ${controllerNominee})`
            } on chain: ${chain} (Controller for currency: ${currency})`
          );
        } else {
          // Vault
          const vaultAddress = addresses[chain][currency].Vault;
          const vaultContract = new ethers.Contract(
            vaultAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [vaultOwner, vaultNominee, ] =
            await getOwnerAndNominee(vaultContract);
          console.log(
            `Owner of ${vaultAddress} is ${vaultOwner}${
              vaultNominee === ZERO_ADDRESS ? "" : ` (nominee: ${vaultNominee})`
            } on chain: ${chain} (Vault for currency: ${currency})`
          );
        }

        for (const connectorChain of Object.keys(
          addresses[chain][currency].connectors
        )) {
          for (const connectorType of Object.keys(
            addresses[chain][currency].connectors[connectorChain]
          )) {
            const connectorAddress = addresses[chain][currency].connectors[connectorChain][connectorType];
            const contract = new ethers.Contract(
              connectorAddress,
              OWNABLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            const [owner, nominee, ] = await getOwnerAndNominee(contract);
            console.log(
              `Owner of ${connectorAddress} is ${owner}${
                nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
              } on chain: ${chain} (Connector for ${currency}, conn-chain: ${connectorChain}, conn-type: ${connectorType}`
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
