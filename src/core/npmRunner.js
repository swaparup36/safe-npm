import { execSync } from "child_process";

export function runNpmInstall() {
  console.log("📦 Installing dependencies (scripts disabled)...");

  execSync("npm install --ignore-scripts", {
    stdio: "inherit"
  });
}