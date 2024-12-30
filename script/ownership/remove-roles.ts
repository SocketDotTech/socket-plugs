import { config as dotenvConfig } from "dotenv";
import { getProjectAddresses } from "../helpers";
import { Signer, Wallet, ethers } from "ethers";
import { AccessControl, AccessControl__factory } from "../../typechain-types";
import { getProviderFromChainSlug, getOverrides } from "../helpers/networks";
import {
  ChainSlug,
  SBAddresses,
  SBTokenAddresses,
  STAddresses,
  STTokenAddresses,
} from "../../src";
import { ContractList, getContractList } from "./util";
import {
  CONTROLLER_ROLE,
  LIMIT_UPDATER_ROLE,
  RESCUE_ROLE,
} from "../constants/roles";

dotenvConfig();

/**
 * Usage
 *
 * --oldowner       Specify the old owner to remove roles from.
 *                  This flag is required.
 *                  Eg. npx --oldowner=0x5f34 ts-node script/ownership/remove-roles.ts
 *
 * --sendtx         Send revoke tx along with role check.
 *                  Default is only check roles.
 *                  Eg. npx --oldowner=0x5f34 --sendtx ts-node script/ownership/remove-roles.ts
 *
 * --chains         Run only for specified chains.
 *                  Default is all chains.
 *                  Eg. npx --oldowner=0x5f34 --chains=10,2999 ts-node script/ownership/remove-roles.ts
 */

let oldOwner = process.env.npm_config_oldowner;
if (!oldOwner) {
  console.error("Error: oldowner flag is required");
  process.exit(1);
}
oldOwner = oldOwner.toLowerCase();

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
          await checkAndRevokeRoles(
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

const checkAndRevokeRoles = async (
  contractAddress: string,
  signer: Signer,
  chainSlug: string,
  label: string
) => {
  label = label.padEnd(45);
  const contract = new ethers.Contract(
    contractAddress,
    AccessControl__factory.abi,
    signer
  ) as AccessControl;

  try {
    // Check roles
    const roles = [LIMIT_UPDATER_ROLE, CONTROLLER_ROLE, RESCUE_ROLE];
    for (const role of roles) {
      const hasRole = await contract.hasRole(role, oldOwner);
      if (!hasRole) {
        console.log(` ✔ ${label}: Role already revoked: ${role}`);
        continue;
      }

      if (sendTx) {
        console.log(`✨ ${label}: Revoking role: ${role}`);

        const owner = (await contract.owner()).toLowerCase();
        if (signerAddress !== owner) {
          console.log(`❗ ${label}: Signer is not current owner`);
          return;
        }

        const tx = await contract.revokeRole(role, oldOwner, {
          ...getOverrides(parseInt(chainSlug)),
        });
        const receipt = await tx.wait();
        console.log(`🚀 ${label}: Done: ${receipt.transactionHash}`);
      } else {
        console.log(`✨ ${label}: Needs role revoked: ${role}`);
      }
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
