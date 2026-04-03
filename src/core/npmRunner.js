import { execSync } from "child_process";

export function runNpmInstall() {
  console.log("📦 Installing dependencies (scripts disabled)...");

  execSync("npm install --ignore-scripts", {
    stdio: "inherit"
  });
}

export function runNpmInstallPackage(packages) {
  console.log(`📦 Installing packages: ${packages.join(", ")} (scripts disabled)...`);
  
  execSync(`npm install ${packages.join(" ")} --ignore-scripts`, {
    stdio: "inherit"
  });
}