#!/usr/bin/env ts-node

import { addProject } from "./setup/addNewProject";
import { addNewToken } from "./setup/addNewToken";
import { editProject } from "./setup/editProject";
import prompts, { PromptObject } from "prompts";

const backOption = { title: "Back", value: "back" };
const exitOption = { title: "Exit", value: "exit" };

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === "help") {
    showHelp();
    return;
  }

  const command = args[0];

  switch (command) {
    case "new":
      await handleAddProject();
      break;
    case "edit":
      await handleEditProject();
      break;
    case "add_token":
      await handleAddNewToken();
      break;
    default:
      console.log("Unknown command");
      showHelp();
  }
}

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

async function handlePrompts(questions: PromptObject[]): Promise<any> {
  let result = {};
  for (const question of questions) {
    const response = await prompts({
      ...question,
      choices: Array.isArray(question.choices)
        ? [...question.choices, backOption, exitOption]
        : undefined,
    });
    if (response[question.name] === "back") {
      return "back";
    } else if (response[question.name] === "exit") {
      process.exit(0);
    }
    result = { ...result, ...response };
  }
  return result;
}

async function handleAddProject() {
  while (true) {
    const projectConfig = await addProject(handlePrompts);
    if (projectConfig === "back") {
      continue;
    }
    break;
  }
}

async function handleEditProject() {
  while (true) {
    const editConfig = await editProject(handlePrompts);
    if (editConfig === "back") {
      continue;
    }
    break;
  }
}

async function handleAddNewToken() {
  while (true) {
    const newTokenConfig = await addNewToken(handlePrompts);
    if (newTokenConfig === "back") {
      continue;
    }
    break;
  }
}

main();
