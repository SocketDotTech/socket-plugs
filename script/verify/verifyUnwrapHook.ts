import { HardhatRuntimeEnvironment } from "hardhat/types";

export const main = async () => {
  const address = "0x5cE6A0a395178f18b93A49795b8EC452fA4d0F7d";

  try {
    const hre = require("hardhat") as HardhatRuntimeEnvironment;

    console.log(`Verifying UnwrapSuperToken at ${address}`);

    try {
      await hre.run("verify:verify", {
        address: address,
        constructorArguments: [
          "0x3a2E7D1E98A4a051B0766f866237c73643fDF360",
          "0x8C1e6969Ca76Ca73a9B002fE8085F6A45B3679e5",
          "0x78860E9be983caBCdA2C101cbc185B23Efd1F4Cc",
          "0x988a44f0ea2611B6a0f5ed73e1eC180Fb145CF21",
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
