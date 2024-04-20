import { updateAllAddressesFile, updateDetailsFile } from "./deployUtils";

export const main = async () => {
  try {
    await updateAllAddressesFile();

    await updateDetailsFile();
  } catch (error) {
    console.log(error);
  }
};

main();
