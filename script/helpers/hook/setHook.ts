import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const controllerAddress = "0xA4b377a04B7591C5F96937890a3306cF949f41a0";

  const hookAddress = "0xda0E570169fDE5F97afF51a797159f9de0F926d7";

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.POLTER_TESTNET_RPC
  );

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
    const tx = await bridgeContract.updateHook(hookAddress, true);
    console.log("tx", tx.hash);
    await tx.wait();

    const hookAddressAfter = await bridgeContract.hook__();
    console.log("hookAddressAfter", hookAddressAfter);

    return hookAddressAfter;
  } catch (error) {
    console.error("Error fetching hook address:", error);
    throw error;
  }
}

getHookAddress("631571");
