import { setupConfigs } from "./deploy/helpers/setupConfig";

setupConfigs()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
