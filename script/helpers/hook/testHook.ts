import { ethers, network } from "hardhat";
import { getOverrides } from "../networks";

export const main = async () => {
  let controllerAddress = "";
  let hookAddress = "";
  let connector = "";
  let tokenAddress = "";
  let provider;

  if (network.name === "polter") {
    // polter-testnet
    controllerAddress = "0x42e5E7c6fE23f01bD1388C1ac2Bc0417007C016b";
    hookAddress = "0xF616d065b25ae91aBFB0B4a1729c7dD73597C1C5";
    connector = "0xCc3fc1Ebc23C5Cb3674cA51f77eE58A9acaEcb25";
    tokenAddress = "0x33A5BBa7C07E6d30FC10e5Cb0847b925A7e7496F";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0x24be569085c3e4b6AeBa2dfB7555E51290AA4350";
    hookAddress = "0x2d25dB3BC421ea93d0A150D375E3E882cdcf60c5";
    connector = "0xC8838B87fD1b979D3982A2ffa7CBA3456cE1c27b";
    tokenAddress = "0xF679b8D109b2d23931237Ce948a7D784727c0897";
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

  const bridgeAmount = ethers.utils.parseEther("10");
  const feeAmount = bridgeAmount.div(1000);
  const gasLimit = 2000000;

  try {
    let approveTx = await tokenContract.approve(
      bridgeContract.address,
      bridgeAmount,
      { gasPrice: 30000000000 }
    );
    console.log("Tokens approved for bridge: ", approveTx.hash);
    await approveTx.wait();

    approveTx = await tokenContract.approve(hookAddress, feeAmount, {
      gasPrice: 30000000000,
    });
    console.log("Tokens approved for hook: ", approveTx.hash);
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
