#!/usr/bin/env ts-node

import { initDeploymentConfig } from "./constants";
import { addProject } from "./setup/newProject/main";
import { addNewToken } from "./setup/addNewToken";
import { editProject } from "./setup/editProject";
import { addNewNFT } from "./setup/addNewNFT";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case "new":
      await addProject();
      break;
    case "edit":
      await editProject();
      break;
    case "addToken":
      await addNewToken();
      break;
    case "addNFT":
      await addNewNFT();
      break;
    default:
      console.log("Unknown command");
  }
}

main();
