import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const controllerAddress = "0x848d95fc52Ee5C7F145CB8A444d814F0183832e0";

  const hookAddress = "0xaCD22bD3306A24748f340DA8eF924012b0613387";

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
