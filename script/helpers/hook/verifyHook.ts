import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const address = "0xA4b377a04B7591C5F96937890a3306cF949f41a0";

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.POLTER_TESTNET_RPC
  );
  const bridgeABI = ["function hook__() public view returns (address)"];

  const bridgeContract = new ethers.Contract(address, bridgeABI, provider);

  try {
    const hookAddress = await bridgeContract.hook__();
    console.log("hookAddress", hookAddress);
    return hookAddress;
  } catch (error) {
    console.error("Error fetching hook address:", error);
    throw error;
  }
}

getHookAddress("631571");
