import { ethers, network } from "hardhat";

export const main = async () => {
  let controllerAddress = "";
  let hookAddress = "";
  let provider;

  if (network.name === "polter") {
    // polter-testnet
    controllerAddress = "0x49017f31dB018eAD84E67A382B5f3f796695aAc3";
    hookAddress = "0xDf56a16F0DCBFc23403EEE8334A93A41Effe9a28";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0x3aa86893F04dd7fbaa63Dacc8E6bd887521E3BaE";
    hookAddress = "0x2DF0C8E2f0AAB101A1667E86D44e809E7cBA408c";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLYGON_AMOY_RPC
    );
  } else if (network.name === "matic") {
    controllerAddress = "";
    hookAddress = "";
  } else if (network.name === "geist") {
    controllerAddress = "0x8C1e6969Ca76Ca73a9B002fE8085F6A45B3679e5";
    hookAddress = "0x0000000000000000000000000000000000000000";
    provider = new ethers.providers.JsonRpcProvider(process.env.GEIST_RPC);
  } else {
    throw Error("No network settings for " + network.name);
  }

  const signer = new ethers.Wallet(process.env.OWNER_SIGNER_KEY, provider);

  const bridgeABI = [
    "function hook__() public view returns (address)",
    "function updateHook(address hook_, bool approve_) external",
  ];

  const bridgeContract = new ethers.Contract(
    controllerAddress,
    bridgeABI,
    signer
  );

  try {
    const hookAddressBefore = await bridgeContract.hook__();
    console.log("hookAddressBefore", hookAddressBefore);

    console.log("updating hook");
    const tx = await bridgeContract.updateHook(hookAddress, true, {
      gasPrice: 30000000000,
    });
    console.log("tx", tx.hash);
    await tx.wait();

    const hookAddressAfter = await bridgeContract.hook__();
    console.log("hookAddressAfter", hookAddressAfter);
  } catch (error) {
    console.error("Error fetching hook address:", error);
    throw error;
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
