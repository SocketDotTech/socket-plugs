#!/usr/bin/env ts-node

import { initDeploymentConfig } from "./constants";
import { addProject } from "./setup/newProject/main";
import { addNewToken } from "./setup/addNewToken";
import { editProject } from "./setup/editProject";

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
    case "add_token":
      await addNewToken();
      break;
    default:
      console.log("Unknown command");
  }
}

main();
