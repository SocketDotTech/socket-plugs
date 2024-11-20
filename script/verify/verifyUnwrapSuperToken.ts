import { HardhatRuntimeEnvironment } from "hardhat/types";

export const main = async () => {
  const address = "0x78860E9be983caBCdA2C101cbc185B23Efd1F4Cc";

  try {
    const hre = require("hardhat") as HardhatRuntimeEnvironment;

    console.log(`Verifying UnwrapSuperToken at ${address}`);

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [
          "Socket GHST",
          "SGHST",
          18,
          "0x3a2E7D1E98A4a051B0766f866237c73643fDF360",
          "0x3a2E7D1E98A4a051B0766f866237c73643fDF360",
          0,
        ],
      });
      console.log(`Successfully verified UnwrapSuperToken for ${address}`);
    } catch (error) {
      console.error(`Error verifying UnwrapSuperToken for ${address}:`, error);
    }
  } catch (error) {
    console.error("Error in verification script:", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
