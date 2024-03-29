import { getSuperBridgeAddresses } from "../helpers";

export const main = async () => {
  try {
    let addresses = await getSuperBridgeAddresses();
    console.log("reached here: ", { addresses });
  } catch (error) {
    console.log(error);
  }
};

main();
