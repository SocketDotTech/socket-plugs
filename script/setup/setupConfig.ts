import prompts from "prompts";
import { addProject } from "./addNewProject";
import { addNewToken } from "./addNewToken";
import { config } from "dotenv";
import { editProject } from "./editProject";
config();
export async function setupConfigs() {
  let actionInfo = await prompts([
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
  }
}
