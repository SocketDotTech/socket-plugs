import prompts from "prompts";
import { addProject } from "./addNewProject";
import { addNewToken } from "./addNewToken";
import { config } from "dotenv";
config();
export async function setupConfigs() {
  while (1) {
    const actionInfo = await prompts([
      {
        name: "action",
        type: "select",
        choices: [
          {
            title: "Add a new Project",
            value: "addProject",
          },
          {
            title: "Edit an existing Project",
            value: "editProject",
          },
          {
            title: "Add a new Token",
            value: "addToken",
          },
          {
            title: "Exit",
            value: "exit",
          },
        ],
        message: "Select an action to perform",
      },
    ]);

    if (actionInfo.action === "addProject") {
      await addProject();
    } else if (actionInfo.action === "editProject") {
      await editProject();
    } else if (actionInfo.action === "addToken") {
      await addNewToken();
    } else if (actionInfo.action === "exit") {
      process.exit(0);
    }
  }
}

export const editProject = async () => {};
