import {
  getSuperBridgeAddresses,
  getSuperTokenAddresses,
  ZERO_ADDRESS,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { getSocketOwner } from "../constants/config";
import { OWNABLE_ABI } from "../constants/abis/ownable";
import { ChainSlug } from "@socket.tech/dl-core";
import { HookContracts, SBAddresses, STAddresses } from "../../src";

const chainToExpectedOwner = {
  [ChainSlug.MAINNET]: "0x246d38588b16Dd877c558b245e6D5a711C649fCF",
  [ChainSlug.ARBITRUM]: "0x2CcF21e5912e9ecCcB0ecdEe9744E5c507cf88AE",
  [ChainSlug.LYRA]: "0xB176A44D819372A38cee878fB0603AEd4d26C5a5",
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

async function checkAndChange(
  chainAddresses: any,
  chain: ChainSlug,
  newOwner: string,
  contractType: string,
  token: string
) {
  const address = chainAddresses[contractType];
  if (!address) {
    console.error(`Contract not found for chain ${chain} ${contractType}`);
    return;
  }
  const contract = new ethers.Contract(
    address,
    OWNABLE_ABI,
    getSignerFromChainSlug(chain)
  );
  const [owner, nominee, type] = await getOwnerAndNominee(contract);
  console.log(
    `Owner of ${address} is ${owner}${
      nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
    } on chain: ${chain} (${contractType} for ${token})`
  );

  await handleOwnershipChangeover(
    contract,
    newOwner,
    chain,
    owner,
    nominee,
    type
  );
}

async function handleOwnershipChangeover(
  contract: ethers.Contract,
  newOwner: string,
  chain: ChainSlug,
  owner: string,
  nominee: string,
  type: 0 | 1
) {
  if (owner === getSocketOwner() && nominee === ZERO_ADDRESS) {
    if (type === 0) {
      const tx = await contract.nominateOwner(newOwner, {
        ...overrides[chain],
      });
      console.log("Nominating, tx hash: ", tx.hash);
      await tx.wait();
    } else {
      const tx = await contract.transferOwnership(newOwner, {
        ...overrides[chain],
      });
      console.log("Nominating, tx hash: ", tx.hash);
      await tx.wait();
    }
  }
}

async function checkAndTransferOwnership(addresses: SBAddresses | STAddresses) {
  for (const chain of Object.keys(addresses)) {
    console.log(`\nChecking addresses for chain ${chain}`);
    if (!chainToExpectedOwner?.[+chain]) {
      console.error(`Expected owner not found for chain ${chain}`);
      throw new Error(`Expected owner not found for chain ${chain}`);
    }
    console.log(
      `Expected owner found for chain ${chain}, ${chainToExpectedOwner[+chain]}`
    );
    for (const token of Object.keys(addresses[chain])) {
      for (const contractType of [
        "Controller",
        "Vault",
        ...Object.keys(HookContracts),
        "MintableToken",
        "SuperToken",
      ]) {
        if (contractType in addresses[chain][token]) {
          await checkAndChange(
            addresses[chain][token],
            +chain,
            chainToExpectedOwner[+chain],
            contractType,
            token
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

          await handleOwnershipChangeover(
            contract,
            chainToExpectedOwner[+chain],
            +chain,
            owner,
            nominee,
            type
          );
        }
      }
    }
  }
}

export const main = async () => {
  try {
    console.log("\n== SuperBridge Addresses ==\n");
    await checkAndTransferOwnership(getSuperBridgeAddresses());

    console.log("\n== SuperToken Addresses ==\n");
    await checkAndTransferOwnership(getSuperTokenAddresses());
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
