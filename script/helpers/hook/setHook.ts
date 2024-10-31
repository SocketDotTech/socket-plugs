import { ethers, network } from "hardhat";
import { CONTROLLER_ROLE } from "../../constants";

export const main = async () => {
  let controllerAddress = "";
  let hookAddress = "";
  let tokenAddress = "";
  let provider;

  if (network.name === "polter") {
    // polter-testnet
    controllerAddress = "0x9091977076DD10A7721F4648fcE7E09371df7Bc5";
    hookAddress = "0x46f6B69E132dB843b8bC01dAf19535b63835557e";
    tokenAddress = "0xA76ea667a448ECAC757665b7998c945Fac05fBDe";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLTER_TESTNET_RPC
    );
  } else if (network.name === "amoy") {
    controllerAddress = "0xD079A4FCaE760a53D90C53621B60Be9a901639F4";
    hookAddress = "0x5392EfA2B1Ddd61Bd0b2B1eadD04D654E5C5c715";
    tokenAddress = "0xF679b8D109b2d23931237Ce948a7D784727c0897";
    provider = new ethers.providers.JsonRpcProvider(
      process.env.POLYGON_AMOY_RPC
    );
  } else if (network.name === "matic") {
    controllerAddress = "";
    hookAddress = "";
    tokenAddress = "";
  } else if (network.name === "geist") {
    controllerAddress = "";
    hookAddress = "";
    tokenAddress = "";
  } else {
    throw Error("No network settings for " + network.name);
  }

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
    const tx = await bridgeContract.updateHook(hookAddress, true, {
      gasPrice: 30000000000,
    });
    console.log("tx", tx.hash);
    await tx.wait();

    const hookAddressAfter = await bridgeContract.hook__();
    console.log("hookAddressAfter", hookAddressAfter);

    if (network.name === "polter" || network.name === "geist") {
      const tokenContract = await ethers.getContractAt(
        "UnwrapSuperToken",
        tokenAddress,
        signer
      );

      console.log("setting controller role to the hook");
      const tx = await tokenContract.grantRole(CONTROLLER_ROLE, hookAddress, {
        gasPrice: 30000000000,
      });
      console.log("tx", tx.hash);
      await tx.wait();
    }
  } catch (error) {
    console.error("Error fetching hook address:", error);
    throw error;
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
