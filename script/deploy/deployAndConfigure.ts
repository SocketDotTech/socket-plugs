import { configure } from "./configure";
import { deploy } from "./deploy";

export const main = async () => {
  await deploy();
  await configure();
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
