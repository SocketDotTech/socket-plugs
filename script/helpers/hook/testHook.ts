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
    controllerAddress = "0x9091977076DD10A7721F4648fcE7E09371df7Bc5";
    hookAddress = "0x46f6B69E132dB843b8bC01dAf19535b63835557e";
    connector = "0xe24Edb991E307C3A4ef5833da2fE49C86D5b2F47";
    tokenAddress = "0xA76ea667a448ECAC757665b7998c945Fac05fBDe";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0xD079A4FCaE760a53D90C53621B60Be9a901639F4";
    hookAddress = "0x5392EfA2B1Ddd61Bd0b2B1eadD04D654E5C5c715";
    connector = "0xCB08705502C14c99B25607e6Cc7B11DD84E41589";
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
