import {
  getOwnerAndNominee,
  getProjectAddresses,
  OWNABLE_ABI,
  ZERO_ADDRESS,
} from "./utils";
import { Contract, ethers } from "ethers";
import { getProviderFromChainSlug, getSignerFromChainSlug } from "./networks";
import { isAppChain } from "./constants";
import { ERC20, ERC20__factory } from "../../typechain-types";
import { tokenDecimals } from "../../src";

const MINTABLE_ABI = [
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "minters",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "permitted",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "isMinter",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    for (const chain of Object.keys(addresses)) {
      if (chain === "default") continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const currency of Object.keys(addresses[chain])) {
        if (currency === "default") continue;
        if (!isAppChain(+chain)) continue;

        // Vault
        const token = addresses[chain][currency].MintableToken;
        const controller = addresses[chain][currency].Controller;
        const mintable = new Contract(
          token,
          MINTABLE_ABI,
          getProviderFromChainSlug(+chain)
        );
        let isMinter;
        try {
          isMinter = await mintable.minters(controller);
        } catch (error) {
          try {
            isMinter = await mintable.permitted(controller);
          } catch (error) {
            isMinter = await mintable.isMinter(controller);
          }
        }

        console.log(
          `Vault (${controller}) for ${currency} (${token}) on chain ${chain} ${
            isMinter ? "can" : "cannot"
          } mint`
        );
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
