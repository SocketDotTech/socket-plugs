import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const controllerAddress = "0x425096b13F41405653392438ad33cebB598bC174";

  const hookAddress = "0x8602AA51da2a6769DEBea9bf1Bcd14737b617a37";

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

getHookAddress("80002");
