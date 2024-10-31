import { ethers } from "ethers";
import { network } from "hardhat";

export const main = async () => {
  let controllerAddress = "";
  let hookAddress = "";
  let provider;

  if (network.name === "polter") {
    // polter-testnet
    controllerAddress = "0x42e5E7c6fE23f01bD1388C1ac2Bc0417007C016b";
    hookAddress = "0xF616d065b25ae91aBFB0B4a1729c7dD73597C1C5";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0x24be569085c3e4b6AeBa2dfB7555E51290AA4350";
    hookAddress = "0x2d25dB3BC421ea93d0A150D375E3E882cdcf60c5";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLYGON_AMOY_RPC
    );
  } else if (network.name === "matic") {
    controllerAddress = "";
    hookAddress = "";
  } else if (network.name === "geist") {
    controllerAddress = "";
    hookAddress = "";
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

    return hookAddressAfter;
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
