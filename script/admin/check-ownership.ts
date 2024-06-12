import {
  getOwnerAndNominee,
  getSuperBridgeAddresses,
  ZERO_ADDRESS,
} from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { OWNABLE_ABI } from "../constants/abis/ownable";
import { Tokens } from "../../src/enums";
import yargs from "yargs";

const checkOwner = async (
  contractName: string,
  contract: ethers.Contract,
  token: Tokens,
  chain: string
) => {
  const [owner, nominee] = await getOwnerAndNominee(contract);
  console.log(
    `Owner of ${contract.address} is ${owner}${
      nominee === ZERO_ADDRESS ? "" : ` (nominee: ${nominee})`
    } on chain: ${chain} (${contractName} for token: ${token})`
  );
};

const argv = yargs
  .options({
    token: { type: "string", demandOption: false },
    "chain-id": { type: "number", demandOption: false },
  })
  .example(
    "npx ts-node script/admin/check-ownership.ts DAI 1",
    "Check ownership for DAI token on chain 1"
  )
  .example(
    "npx ts-node script/admin/check-ownership.ts DAI",
    "Check ownership for DAI token on all chains"
  )
  .example(
    "npx ts-node script/admin/check-ownership.ts",
    "Check ownership for all tokens on all chains"
  )
  .help().argv;

export const main = async () => {
  try {
    const addresses = await getSuperBridgeAddresses();
    const chainId = argv["chain-id"];
    const tokenParam = argv["token"];

    for (const chain of Object.keys(addresses)) {
      if (chainId && +chain !== chainId) continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (token && token !== tokenParam) continue;
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
            await checkOwner(
              "Exchange Rate",
              exchangeRateContract,
              token as Tokens,
              chain
            );
          }

          const controllerAddress = addresses[chain][token].Controller;
          const controllerContract = new ethers.Contract(
            controllerAddress,
            OWNABLE_ABI,
            getSignerFromChainSlug(+chain)
          );
          await checkOwner(
            "Controller",
            controllerContract,
            token as Tokens,
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
          await checkOwner("Vault", vaultContract, token as Tokens, chain);
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
            await checkOwner(
              `Connector ${connectorType}`,
              contract,
              token as Tokens,
              chain
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
