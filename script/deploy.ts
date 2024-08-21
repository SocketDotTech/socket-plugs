import { initDeploymentConfig } from "./constants";
import { configure } from "./deploy/configure";
import { deploy } from "./deploy/deploy";

import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 20;

export const main = async () => {
  try {
    await initDeploymentConfig();
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
