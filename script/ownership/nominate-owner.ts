import { config as dotenvConfig } from "dotenv";
import { getProjectAddresses } from "../helpers";
import { Signer, Wallet, ethers } from "ethers";
import { Ownable, Ownable__factory } from "../../typechain-types";
import { getProviderFromChainSlug, overrides } from "../helpers/networks";
import {
  ChainSlug,
  SBAddresses,
  SBTokenAddresses,
  STAddresses,
  STTokenAddresses,
} from "../../src";
import { ContractList, getContractList } from "./util";

dotenvConfig();

/**
 * Usage
 *
 * --newowner       Specify the new owner to be nominated.
 *                  This flag is required.
 *                  Eg. npx --newowner=0x5f34 ts-node script/ownership/nominate-owner.ts
 *
 * --sendtx         Send nominate tx along with ownership check.
 *                  Default is only check owner, nominee.
 *                  Eg. npx --newowner=0x5f34 --sendtx ts-node script/ownership/nominate-owner.ts
 *
 * --chains         Run only for specified chains.
 *                  Default is all chains.
 *                  Eg. npx --newowner=0x5f34 --chains=10,2999 ts-node script/ownership/nominate-owner.ts
 */

let newOwner = process.env.npm_config_newowner;
if (!newOwner) {
  console.error("Error: newowner flag is required");
  process.exit(1);
}
newOwner = newOwner.toLowerCase();

const signerKey = process.env.OWNER_SIGNER_KEY;
if (!signerKey) {
  console.error("Error: OWNER_SIGNER_KEY is required");
}

const sendTx = process.env.npm_config_sendtx == "true";

const filterChainsParam = process.env.npm_config_chains
  ? process.env.npm_config_chains.split(",")
  : null;
const addresses: SBAddresses | STAddresses = getProjectAddresses();
const allChainSlugs = Object.keys(addresses);
const filteredChainSlugs = !filterChainsParam
  ? allChainSlugs
  : allChainSlugs.filter((c) => filterChainsParam.includes(c));

const wallet: Wallet = new ethers.Wallet(signerKey);
const signerAddress = wallet.address.toLowerCase();

const main = async () => {
  await Promise.all(
    filteredChainSlugs.map(async (chainSlug) => {
      const provider = getProviderFromChainSlug(
        parseInt(chainSlug) as ChainSlug
      );
      const signer = wallet.connect(provider);

      const chainAddresses = addresses[chainSlug];
      for (const token of Object.keys(chainAddresses)) {
        const tokenAddresses: SBTokenAddresses | STTokenAddresses =
          addresses[chainSlug][token];
        let contractList: ContractList = getContractList(
          tokenAddresses,
          chainSlug,
          token
        );

        for (const contract of contractList) {
          await checkAndNominate(
            contract.address,
            signer,
            chainSlug,
            contract.label
          );
        }
      }
    })
  );
};

const checkAndNominate = async (
  contractAddress: string,
  signer: Signer,
  chainSlug: string,
  label: string
) => {
  label = label.padEnd(45);
  const contract = new ethers.Contract(
    contractAddress,
    Ownable__factory.abi,
    signer
  ) as Ownable;

  try {
    const owner = (await contract.owner()).toLowerCase();
    const nominee = (await contract.nominee()).toLowerCase();

    console.log(` - ${label}: Checking: ${owner}, ${nominee}`);

    if (newOwner === owner) {
      console.log(` ✔ ${label}: Already claimed`);
      return;
    }

    if (newOwner === nominee) {
      console.log(` ✔ ${label}: Already nominated`);
      return;
    }

    if (signerAddress !== owner) {
      console.log(`❗ ${label}: Signer is not current owner`);
      return;
    }

    if (sendTx) {
      console.log(`✨ ${label}: Nominating`);
      const tx = await contract.nominateOwner(newOwner, {
        ...overrides[parseInt(chainSlug)],
      });
      const receipt = await tx.wait();
      console.log(`🚀 ${label}: Done: ${receipt.transactionHash}`);
    } else {
      console.log(`✨ ${label}: Needs nominating`);
    }
  } catch (e) {
    console.error(`❗ ${label}: Error while checking ${contractAddress}`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
