import { ethers, network } from "hardhat";

export const main = async () => {
  let controllerAddress = "";
  let connector = "";
  let tokenAddress = "";
  let provider;

  if (network.name === "polter") {
    // polter-testnet
    controllerAddress = "0x49017f31dB018eAD84E67A382B5f3f796695aAc3";
    connector = "0xC1044dFa349B6C7381eE4603660e974Bdab5dc40";
    tokenAddress = "0xCef3AdFaE288d3304e42582a0786e0276181Acf2";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0x3aa86893F04dd7fbaa63Dacc8E6bd887521E3BaE";
    connector = "0x092D6243ee5602D2b94d4Ba75c3bd7e220f740D2";
    tokenAddress = "0xF679b8D109b2d23931237Ce948a7D784727c0897";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLYGON_AMOY_RPC
    );
  } else if (network.name === "matic") {
    controllerAddress = "";
  } else if (network.name === "geist") {
    controllerAddress = "";
  } else {
    throw Error("No network settings for " + network.name);
  }

  const signer = new ethers.Wallet(process.env.OWNER_SIGNER_KEY, provider);

  const bridgeABI = [
    "function bridge(address receiver_, uint256 amount_, uint256 msgGasLimit_, address connector_, bytes calldata extraData_, bytes calldata options_ ) external payable",
  ];

  const tokenContract = await ethers.getContractAt(
    "IERC20",
    tokenAddress,
    signer
  );

  const bridgeContract = new ethers.Contract(
    controllerAddress,
    bridgeABI,
    signer
  );

  const bridgeAmount = ethers.utils.parseEther("50");
  const gasLimit = 2000000;

  try {
    const approveTx = await tokenContract.approve(
      bridgeContract.address,
      bridgeAmount,
      { gasPrice: 30000000000 }
    );
    console.log("Tokens approved for bridge: ", approveTx.hash);
    await approveTx.wait();

    console.log("testing hook");
    const tx = await bridgeContract.bridge(
      signer.address,
      bridgeAmount,
      gasLimit,
      connector,
      "0x",
      "0x",
      { gasPrice: 30000000000 }
    );
    console.log("tx", tx.hash);
    await tx.wait();
  } catch (error) {
    console.error("Error testing hook:", error);
    throw error;
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
