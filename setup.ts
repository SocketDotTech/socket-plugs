import { execSync } from "child_process";
import { existsSync, readFileSync, writeFileSync, lstatSync } from "fs";
import { join } from "path";

// Path to the script.ts file
const scriptPath = join(__dirname, "script", "script.ts");
const symlinkPath = "/usr/local/bin/socket";

function addShebang() {
  console.log("setting up socket....");
  const shebang = "#!/usr/bin/env ts-node\n";
  const content = readFileSync(scriptPath, "utf8");
  if (!content.startsWith(shebang)) {
    writeFileSync(scriptPath, shebang + content);
    console.log("Shebang added to script.ts");
  } else {
    console.log("Shebang already present in script.ts");
  }
}

function makeExecutable() {
  execSync(`chmod +x ${scriptPath}`);
  console.log("script.ts made executable");
}

function createSymlink() {
  try {
    if (existsSync(symlinkPath)) {
      const stats = lstatSync(symlinkPath);
      const removeCommand = stats.isSymbolicLink()
        ? `unlink ${symlinkPath}`
        : `rm -rf ${symlinkPath}`;
      console.log(
        `Removing existing ${
          stats.isSymbolicLink() ? "symbolic link" : "file or directory"
        }...`
      );
      execSync(removeCommand);
      console.log(
        `Existing ${
          stats.isSymbolicLink() ? "symbolic link" : "file or directory"
        } removed.`
      );
    }

    console.log("Creating new symbolic link...");
    execSync(`ln -s ${scriptPath} ${symlinkPath}`);
    console.log(`Symbolic link created at ${symlinkPath}`);
  } catch (err) {
    console.error("Error creating symbolic link", err);
  }
}

function ensureTsNode() {
  try {
    execSync("ts-node -v", { stdio: "ignore" });
    console.log("ts-node is already installed globally");
    console.log("socket setup complete, socket command is now available");
  } catch {
    execSync("npm install -g ts-node");
    console.log("ts-node installed globally");
  }
}

function setup() {
  addShebang();
  makeExecutable();
  createSymlink();
  ensureTsNode();
}

setup();
