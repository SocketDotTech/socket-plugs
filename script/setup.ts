import { setupConfigs } from "./setup/setupConfig";

import { EventEmitter } from "events";
EventEmitter.defaultMaxListeners = 20;

setupConfigs()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
