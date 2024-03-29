import { getSuperBridgeAddresses } from "../helpers";
import { Contract } from "ethers";
import { getProviderFromChainSlug } from "../helpers/networks";
import { isAppChain } from "../helpers/projectConstants";
import { MINTABLE_ABI } from "../constants/abis/mintable";

export const main = async () => {
  try {
    const addresses = await getSuperBridgeAddresses();
    for (const chain of Object.keys(addresses)) {
      console.log(`\nChecking addresses for chain ${chain}`);
      for (const token of Object.keys(addresses[chain])) {
        if (!isAppChain(+chain)) continue;

        const tokenAddress = addresses[chain][token].MintableToken;
        const controller = addresses[chain][token].Controller;
        const mintable = new Contract(
          tokenAddress,
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
          `Controller (${controller}) for ${token} (${tokenAddress}) on chain ${chain} ${
            isMinter ? "can" : "cannot"
          } mint`
        );
      }
    }
  } catch (error) {
    console.error("Error while checking minter", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
