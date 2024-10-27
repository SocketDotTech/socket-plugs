import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const address = "0x855127292feea3e1487f88dE3ACd8038de13B178";

  const hookAddress = "0xbC4aF5e624bCf7D989349b15961Fb701528759Db";

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.POLTER_TESTNET_RPC
  );

  const signer = new ethers.Wallet(process.env.OWNER_SIGNER_KEY, provider);

  const bridgeABI = [
    "function hook__() public view returns (address)",
    "function updateHook(address hook_, bool approve_) external",
  ];

  const bridgeContract = new ethers.Contract(address, bridgeABI, signer);

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
