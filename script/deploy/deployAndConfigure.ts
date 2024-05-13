import { configure } from "./configure";
import { deploy } from "./deploy";

export const main = async () => {
  try {
    let allAddresses = await deploy();
    await configure(allAddresses);
  } catch (error) {
    console.log("Error in deploy and configure: ", error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
