import { getProjectAddresses } from "./utils";
import { ethers } from "ethers";
import { getSignerFromChainSlug, overrides } from "./networks";
import { isAppChain } from "./constants";
import { getSocketOwner, getSocketSignerKey } from "../constants/config";
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const OWNABLE_ABI = [{
  "inputs": [],
  "name": "owner",
  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
  "stateMutability": "view",
  "type": "function"
},{
  "inputs": [],
  "name": "nominee",
  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
  "stateMutability": "view",
  "type": "function"
},
  {
    "inputs": [],
    "name": "pendingOwner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "nominee_",
        "type": "address"
      }
    ],
    "name": "nominateOwner",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
]

const chainToExpectedOwner = {
  1: "0x246d38588b16Dd877c558b245e6D5a711C649fCF",
  10: "0xD4C00FE7657791C2A43025dE483F05E49A5f76A6",
  957: "0xB176A44D819372A38cee878fB0603AEd4d26C5a5",
  8453: "0xbfA8B86391c5eCAd0eBe2B158D9Cd9866DDBAaDa",
  42161: "0x2CcF21e5912e9ecCcB0ecdEe9744E5c507cf88AE",
}

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
    const addresses = await getProjectAddresses();
    for (const chain of Object.keys(addresses)) {
      if (chain === "default") continue;
      console.log(`\nChecking addresses for chain ${chain}`)
      for (const currency of Object.keys(addresses[chain])) {
        if (isAppChain(+chain)) {
          // ExchangeRate and Controller
          const exchangeRateAddress = addresses[chain][currency].ExchangeRate;
          const exchangeRateContract = new ethers.Contract(exchangeRateAddress, OWNABLE_ABI, getSignerFromChainSlug(+chain));
          const [exchangeRateOwner, exchangeRateNominee, exchangeRateType] = await getOwnerAndNominee(exchangeRateContract);
          console.log(`Owner of ${exchangeRateAddress} is ${exchangeRateOwner}${exchangeRateNominee === ZERO_ADDRESS ? "": ` (nominee: ${exchangeRateNominee})`} on chain: ${chain} (ExchangeRate for currency: ${currency})`);

          if (exchangeRateOwner === getSocketOwner() && exchangeRateNominee === ZERO_ADDRESS) {
            if (exchangeRateType === 0) {
              const tx = await exchangeRateContract.nominateOwner(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            } else {
              const tx = await exchangeRateContract.transferOwnership(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            }
          }

          const controllerAddress = addresses[chain][currency].Controller;
          const controllerContract = new ethers.Contract(controllerAddress, OWNABLE_ABI, getSignerFromChainSlug(+chain));
          const [controllerOwner, controllerNominee, controllerType] = await getOwnerAndNominee(controllerContract);
          console.log(`Owner of ${controllerAddress} is ${controllerOwner}${controllerNominee === ZERO_ADDRESS ? "": ` (nominee: ${controllerNominee})`} on chain: ${chain} (Controller for currency: ${currency})`);

          if (controllerOwner === getSocketOwner() && controllerNominee === ZERO_ADDRESS) {
            if (controllerType === 0) {
              const tx = await controllerContract.nominateOwner(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            } else {
              const tx = await controllerContract.transferOwnership(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            }
          }
        } else {
          // Vault
          const vaultAddress = addresses[chain][currency].Vault;
          const vaultContract = new ethers.Contract(vaultAddress, OWNABLE_ABI, getSignerFromChainSlug(+chain));
          const [vaultOwner, vaultNominee, vaultType] = await getOwnerAndNominee(vaultContract);
          console.log(`Owner of ${vaultAddress} is ${vaultOwner}${vaultNominee === ZERO_ADDRESS ? "" : ` (nominee: ${vaultNominee})`} on chain: ${chain} (Vault for currency: ${currency})`);

          if (vaultOwner === getSocketOwner() && vaultNominee === ZERO_ADDRESS) {
            if (vaultType === 0) {
              const tx = await vaultContract.nominateOwner(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            } else {
              const tx = await vaultContract.transferOwnership(chainToExpectedOwner[+chain], {...overrides[+chain]});
              console.log("Nominating, tx hash: ", tx.hash)
              await tx.wait();
            }
          }
        }

        for (const connectorChain of Object.keys(addresses[chain][currency].connectors)) {
          for (const connectorType of Object.keys(addresses[chain][currency].connectors[connectorChain])) {
            const connectorAddress = addresses[chain][currency].connectors[connectorChain][connectorType];
            const contract = new ethers.Contract(connectorAddress, OWNABLE_ABI, getSignerFromChainSlug(+chain));
            const [owner, nominee, type] = await getOwnerAndNominee(contract);
            console.log(`Owner of ${connectorAddress} is ${owner}${nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`} on chain: ${chain} (Connector for ${currency}, conn-chain: ${connectorChain}, conn-type: ${connectorType}`);

            if (owner === getSocketOwner() && nominee === ZERO_ADDRESS) {
              if (type === 0) {
                const tx = await contract.nominateOwner(chainToExpectedOwner[+chain], {...overrides[+chain]});
                console.log("Nominating, tx hash: ", tx.hash)
                await tx.wait();
              } else {
                const tx = await contract.transferOwnership(chainToExpectedOwner[+chain], {...overrides[+chain]});
                console.log("Nominating, tx hash: ", tx.hash)
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
