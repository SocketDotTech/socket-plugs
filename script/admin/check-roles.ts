import { getRoleMembers, getSuperBridgeAddresses } from "../helpers";
import { ethers } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { isSBAppChain } from "../helpers/projectConstants";
import { ALL_ROLES } from "../constants";
import { getHookContract } from "../helpers/common";
import { ChainSlug } from "@socket.tech/dl-core";
import { Tokens } from "../../src/enums";
import { SBTokenAddresses, STTokenAddresses } from "../../src";
import { ROLE_ABI, ROLE_BRIDGED_TOKEN_ABI } from "../constants/abis/role";
import yargs from "yargs";

const argv = yargs
  .options({
    token: { type: "string", demandOption: false },
    "chain-id": { type: "number", demandOption: false },
  })
  .example(
    "npx ts-node script/admin/check-roles.ts DAI 1",
    "Check roles for DAI token on chain 1"
  )
  .example(
    "npx ts-node script/admin/check-roles.ts DAI",
    "Check roles for DAI token on all chains"
  )
  .example(
    "npx ts-node script/admin/check-roles.ts",
    "Check roles for all tokens on all chains"
  )
  .help().argv;

const checkRole = async (
  contractName: string,
  contract: ethers.Contract,
  role: string
) => {
  const members = await getRoleMembers(contract, ALL_ROLES[role]);
  console.log(
    `Addresses with ${role} for ${contractName} are [${members.toString()}]`
  );
};

export const main = async () => {
  try {
    const tokenParam = argv["token"];
    const chainId = argv["chain-id"];
    const addresses = await getSuperBridgeAddresses();

    for (const chain of Object.keys(addresses)) {
      if (chainId && +chain !== chainId) continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (tokenParam && token !== tokenParam) continue;
        console.log(`\nChecking addresses for token ${token}`);
        for (const role of Object.keys(ALL_ROLES)) {
          if (isSBAppChain(+chain, token)) {
            const controllerAddress = addresses[chain][token].Controller;
            const controllerContract = new ethers.Contract(
              controllerAddress,
              ROLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            await checkRole("Controller", controllerContract, role);

            const tokenContract = new ethers.Contract(
              addresses[chain][token].MintableToken,
              ROLE_BRIDGED_TOKEN_ABI,
              getSignerFromChainSlug(+chain)
            );
            await checkRole(token, tokenContract, role);
          } else {
            // Vault
            const vaultAddress = addresses[chain][token].Vault;
            const vaultContract = new ethers.Contract(
              vaultAddress,
              ROLE_ABI,
              getSignerFromChainSlug(+chain)
            );
            await checkRole("Vault", vaultContract, role);
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
            await checkRole(hookContractName, hookContract, role);
          }

          for (const connectorChain of Object.keys(
            addresses[chain][token].connectors
          )) {
            for (const connectorType of Object.keys(
              addresses[chain][token].connectors[connectorChain]
            )) {
              const connectorAddress =
                addresses[chain][token].connectors[connectorChain][
                  connectorType
                ];
              const contract = new ethers.Contract(
                connectorAddress,
                ROLE_ABI,
                getSignerFromChainSlug(+chain)
              );
              await checkRole(`Connector ${connectorType}`, contract, role);
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
