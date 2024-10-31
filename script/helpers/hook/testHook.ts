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
    controllerAddress = "0x2d5e2EEb9aC0aFEAB64D5e54b639e6165de31379";
    hookAddress = "0x4B4a704EAb8632Fa83ee5ec3b84dC67Dd6eC00d4";
    connector = "0x847108CDB225f4fFfc814b6b289EA95dC740ef57";
    tokenAddress = "0x0C3E0a7e65A1DBd096a37526781CC38Aa7345598";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0x521920553b595C959d2d6399e27316c4eAd8844b";
    hookAddress = "0xca74C1fC80293E1e22888D0c2E940178eD6a7BcA";
    connector = "0xb759fa3415f9Aa3F6A2aA9FbF8E8bF9c1E6b0f01";
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

  const bridgeAmount = ethers.utils.parseEther("50");
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
