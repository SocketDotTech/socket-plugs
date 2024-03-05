import {
  getOwnerAndNominee,
  getProjectAddresses,
  OWNABLE_ABI,
  ZERO_ADDRESS,
} from "./utils";
import { ethers } from "ethers";
import { getProviderFromChainSlug, getSignerFromChainSlug } from "./networks";
import { isAppChain } from "./constants";
import { ERC20, ERC20__factory } from "../../typechain-types";
import { tokenDecimals } from "../../src";

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();
    for (const chain of Object.keys(addresses)) {
      if (chain === "default") continue;
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const currency of Object.keys(addresses[chain])) {
        if (currency === "default") continue;
        if (isAppChain(+chain)) continue;

        // Vault
        const currAddress = addresses[chain][currency].NonMintableToken;
        const erc20 = ERC20__factory.connect(
          currAddress,
          getProviderFromChainSlug(+chain)
        );
        const vaultBalance = await erc20.balanceOf(
          addresses[chain][currency].Vault
        );

        console.log(
          `Vault for ${currency} on chain ${chain} has balance: ${ethers.utils.formatUnits(
            vaultBalance,
            tokenDecimals[currency]
          )}`
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
