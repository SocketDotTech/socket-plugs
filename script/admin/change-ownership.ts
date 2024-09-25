import { getSuperBridgeAddresses, ZERO_ADDRESS } from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug, getOverrides } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { getOwner } from "../constants/config";
import { OWNABLE_ABI } from "../constants/abis/ownable";
import { ChainSlug } from "@socket.tech/dl-core";

const chainToExpectedOwner = {
  [ChainSlug.OPTIMISM]: "0xa75509cB7c50362AC59908e2A8c3922aDF3EEF54",
  [ChainSlug.ARBITRUM]: "0xa75509cB7c50362AC59908e2A8c3922aDF3EEF54",
  [ChainSlug.AEVO]: "0xa75509cB7c50362AC59908e2A8c3922aDF3EEF54",
};

async function getOwnerAndNominee(contract: ethers.Contract) {
  const owner = await contract.owner();
  try {
    const nominee = await contract.nominee();
    return [owner, nominee, 0];
  } catch (error) {}
  const pendingOwner = await contract.pendingOwner();
  return [owner, pendingOwner, 1];
}

export const main = async () => {
  try {
    const addresses = getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      console.log(`\nChecking addresses for chain ${chain}`);
      if (!chainToExpectedOwner?.[+chain]) {
        console.error(`Expected owner not found for chain ${chain}`);
        throw new Error(`Expected owner not found for chain ${chain}`);
      }
      console.log(
        `Expected owner found for chain ${chain}, ${
          chainToExpectedOwner[+chain]
        }`
      );
      for (const token of Object.keys(addresses[chain])) {
        if (isSBAppChain(+chain, token)) {
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
            `Owner of ${exchangeRateAddress} is ${exchangeRateOwner}${
              exchangeRateNominee === ZERO_ADDRESS
                ? ""
                : ` (nominee: ${exchangeRateNominee})`
            } on chain: ${chain} (ExchangeRate for token: ${token})`
          );

          if (
            exchangeRateOwner === getOwner() &&
            exchangeRateNominee === ZERO_ADDRESS
          ) {
            if (exchangeRateType === 0) {
              const tx = await exchangeRateContract.nominateOwner(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            } else {
              const tx = await exchangeRateContract.transferOwnership(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            }
          }

          const controllerAddress = addresses[chain][token].Controller;
          const controllerContract = new ethers.Contract(
            controllerAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [controllerOwner, controllerNominee, controllerType] =
            await getOwnerAndNominee(controllerContract);
          console.log(
            `Owner of ${controllerAddress} is ${controllerOwner}${
              controllerNominee === ZERO_ADDRESS
                ? ""
                : ` (nominee: ${controllerNominee})`
            } on chain: ${chain} (Controller for token: ${token})`
          );

          if (
            controllerOwner === getOwner() &&
            controllerNominee === ZERO_ADDRESS
          ) {
            if (controllerType === 0) {
              const tx = await controllerContract.nominateOwner(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            } else {
              const tx = await controllerContract.transferOwnership(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            }
          }
        } else {
          // Vault
          const vaultAddress = addresses[chain][token].Vault;
          const vaultContract = new ethers.Contract(
            vaultAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          const [vaultOwner, vaultNominee, vaultType] =
            await getOwnerAndNominee(vaultContract);
          console.log(
            `Owner of ${vaultAddress} is ${vaultOwner}${
              vaultNominee === ZERO_ADDRESS ? "" : ` (nominee: ${vaultNominee})`
            } on chain: ${chain} (Vault for token: ${token})`
          );

          if (vaultOwner === getOwner() && vaultNominee === ZERO_ADDRESS) {
            if (vaultType === 0) {
              const tx = await vaultContract.nominateOwner(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            } else {
              const tx = await vaultContract.transferOwnership(
                chainToExpectedOwner[+chain],
                { ...getOverrides(+chain) }
              );
              console.log("Nominating, tx hash: ", tx.hash);
              await tx.wait();
            }
          }
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
              `Owner of ${connectorAddress} is ${owner}${
                nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
              } on chain: ${chain} (Connector for ${token}, conn-chain: ${connectorChain}, conn-type: ${connectorType}`
            );

            if (owner === getOwner() && nominee === ZERO_ADDRESS) {
              if (type === 0) {
                const tx = await contract.nominateOwner(
                  chainToExpectedOwner[+chain],
                  { ...getOverrides(+chain) }
                );
                console.log("Nominating, tx hash: ", tx.hash);
                await tx.wait();
              } else {
                const tx = await contract.transferOwnership(
                  chainToExpectedOwner[+chain],
                  { ...getOverrides(+chain) }
                );
                console.log("Nominating, tx hash: ", tx.hash);
                await tx.wait();
              }
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
