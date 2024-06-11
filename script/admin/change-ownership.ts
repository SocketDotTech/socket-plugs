import {
  createBatchFiles,
  execute,
  getOwnerAndNominee,
  getSuperBridgeAddresses,
  ZERO_ADDRESS,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug, overrides } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { getOwner } from "../constants/config";
import { OWNABLE_ABI } from "../constants/abis/ownable";
import { ChainSlug } from "@socket.tech/dl-core";
import { isKinto } from "@kinto-utils/dist/kinto";
import { getHookContract } from "../helpers/common";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";

const chainToExpectedOwner = {
  [ChainSlug.KINTO]: process.env.KINTO_OWNER_ADDRESS,
  [ChainSlug.ARBITRUM]: process.env.ARBITRUM_SAFE,
  [ChainSlug.BASE]: process.env.BASE_SAFE,
  [ChainSlug.MAINNET]: process.env.MAINNET_SAFE,
  // [ChainSlug.OPTIMISM]: process.env.OPTIMISM_SAFE,
};

// check if expected owner is not null
for (const chain of Object.keys(chainToExpectedOwner)) {
  if (!chainToExpectedOwner[+chain]) {
    console.error(`Expected owner not found for chain ${chain}`);
    throw new Error(`Expected owner not found for chain ${chain}`);
  }
}

const processOwnershipChange = async (
  contractName: string,
  contract: ethers.Contract,
  token: Tokens,
  chain: string
) => {
  const [owner, nominee, type] = await getOwnerAndNominee(contract);
  console.log(
    `Owner of ${contract.address} is ${owner}${
      nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
    } on chain: ${chain} (${contractName} for token: ${token})`
  );

  if (owner === getOwner() && nominee === ZERO_ADDRESS) {
    if (!isKinto(chain)) {
      if (type === 0) {
        const tx = await contract.nominateOwner(chainToExpectedOwner[+chain], {
          ...overrides[+chain],
        });
        console.log("Nominating, tx hash: ", tx.hash);
        await tx.wait();

        console.log("Claim ownership tx");
        await execute(contract, "claimOwner", [], parseInt(chain));
      } else {
        const tx = await contract.transferOwnership(
          chainToExpectedOwner[+chain],
          { ...overrides[+chain] }
        );
        console.log("Transferring ownership, tx hash: ", tx.hash);
        await tx.wait();
      }
    } else {
      console.log("TODO: implement ownership change on Kinto chain");
    }
  }
};

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
        `Expected owner for chain ${chain}: ${chainToExpectedOwner[+chain]}`
      );
      for (const token of Object.keys(addresses[chain])) {
        console.log(`\nChecking addresses for token ${token}`);
        if (isSBAppChain(+chain, token)) {
          // ExchangeRate and Controller
          const exchangeRateAddress = addresses[chain][token].ExchangeRate;
          if (exchangeRateAddress) {
            const exchangeRateContract = new ethers.Contract(
              exchangeRateAddress,
              OWNABLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            await processOwnershipChange(
              "Exchange Rate",
              exchangeRateContract,
              token as unknown as Tokens,
              chain
            );
          }
          const controllerAddress = addresses[chain][token].Controller;
          const controllerContract = new ethers.Contract(
            controllerAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          await processOwnershipChange(
            "Controller",
            controllerContract,
            token as unknown as Tokens,
            chain
          );
        } else {
          // Vault
          const vaultAddress = addresses[chain][token].Vault;
          const vaultContract = new ethers.Contract(
            vaultAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          await processOwnershipChange(
            "Vault",
            vaultContract,
            token as unknown as Tokens,
            chain
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
          await processOwnershipChange(
            hookContractName,
            hookContract,
            token as unknown as Tokens,
            chain
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
            await processOwnershipChange(
              "Connector",
              contract,
              token as unknown as Tokens,
              chain
            );
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
