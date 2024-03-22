import { getSuperBridgeAddresses } from "./utils";
import { ethers } from "ethers";
import { getProviderFromChainSlug } from "./networks";
import { isAppChain } from "./constants";
import { ERC20__factory } from "../../typechain-types";
import { tokenDecimals } from "../../src";

export const main = async () => {
  try {
    const addresses = await getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (isAppChain(+chain)) continue;

        const tokenAddress = addresses[chain][token].NonMintableToken;
        const tokenContract = ERC20__factory.connect(
          tokenAddress,
          getProviderFromChainSlug(+chain)
        );
        const vaultBalance = await tokenContract.balanceOf(
          addresses[chain][token].Vault
        );

        console.log(
          `Vault for ${token} on chain ${chain} has balance: ${ethers.utils.formatUnits(
            vaultBalance,
            tokenDecimals[token]
          )}`
        );
      }
    }
  } catch (error) {
    console.error("Error while checking vault balances", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
