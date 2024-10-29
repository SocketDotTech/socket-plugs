import { ethers } from "ethers";

export async function getHookAddress(chain: string): Promise<string> {
  const controllerAddress = "0xA4b377a04B7591C5F96937890a3306cF949f41a0";

  const provider = new ethers.providers.JsonRpcProvider(
    process.env.POLTER_TESTNET_RPC
  );

  const signer = new ethers.Wallet(process.env.OWNER_SIGNER_KEY, provider);
  const bridgeABI = [
    "function bridge(address receiver_, uint256 amount_, uint256 msgGasLimit_, address connector_, bytes calldata extraData_, bytes calldata options_ ) external payable",
  ];

  const bridgeContract = new ethers.Contract(
    controllerAddress,
    bridgeABI,
    signer
  );

  const bridgeAmount = ethers.utils.parseEther("120");
  const neededAmount = ethers.utils.parseEther("25");
  const gasLimit = 2000000;
  const connector = "0xfdb08700CcF55489c277Df5a136Ad8D404a5e1Fd";

  try {
    console.log("testing hook");
    const tx = await bridgeContract.bridge(
      signer.address,
      bridgeAmount,
      gasLimit,
      connector,
      "0x",
      "0x",
      { value: neededAmount, gasLimit: gasLimit }
    );
    console.log("tx", tx.hash);
    await tx.wait();
  } catch (error) {
    console.error("Error fetching hook address:", error);
    throw error;
  }
}

getHookAddress("631571");
