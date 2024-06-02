#!/usr/bin/env ts-node

import { addProject } from "./setup/addNewProject";
import { addNewToken } from "./setup/addNewToken";
import { editProject } from "./setup/editProject";

function showHelp() {
  console.log(`
    Usage:
      socket <command>
      
    Commands:
      new         Add a new Project
      edit        Edit an existing Project
      add_token   Add a new Token
      help        Show this help message
  `);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help") {
    showHelp();
    return;
  }

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
      showHelp();
  }
}

main();
