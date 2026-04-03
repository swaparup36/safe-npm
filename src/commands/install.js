import { runNpmInstall, runNpmInstallPackage } from "../core/npmRunner.js";
import { getLifecycleScripts, getLifecycleScriptsForSpecificPackages } from "../core/scriptExtractor.js";
import { runInSandbox } from "../core/sandboxRunner.js";
import { askUser } from "../utils/prompt.js";
import { loadTrust, saveTrust } from "../core/trustManager.js";
import { createSandbox, cleanupSandbox } from "../core/sandboxManager.js";
import { execSync } from "child_process";

export async function install(packages) {
  if (packages && packages.length > 0) {
    await installSpecificPackages(packages);
  } else {
    await installFromPackageJson();
  }
}

async function installSpecificPackages(packages) {
  runNpmInstallPackage(packages);

  const scripts = getLifecycleScriptsForSpecificPackages(packages);
  const trust = loadTrust();

  const sandboxPath = createSandbox();

  try {
    for (const s of scripts) {
      const key = `${s.name}:${s.hook}`;

      if (trust[key] === "allow") {
        console.log(`✅ Trusted: ${key}`);
        continue;
      }

      console.log(`\n⚠️ Script detected: ${key}`);
      console.log(`Command: ${s.command}`);

      const result = runInSandbox(
        s.command,
        sandboxPath,
        s.relativePath
      );

      console.log("---- Output ----");
      console.log(result.stdout || result.stderr);
      console.log(result.status === 0 ? "Script executed successfully" : "Script execution failed");

      const decision = await askUser(
        "Allow this script? (y/n/always): "
      );

      if (decision === "always" || decision === "y") {
        if (decision === "always") {
          trust[key] = "allow";
        }

        console.log(`Running ${key} in real environment...`);

        execSync(`npm rebuild ${s.name}`, {
          stdio: "inherit"
        });
      }
    }
  } finally {
    cleanupSandbox(sandboxPath);
  }

  saveTrust(trust);
}

async function installFromPackageJson() {
  runNpmInstall();

  const scripts = getLifecycleScripts();
  const trust = loadTrust();

  const sandboxPath = createSandbox();

  try {
    for (const s of scripts) {
      const key = `${s.name}:${s.hook}`;

      if (trust[key] === "allow") {
        console.log(`✅ Trusted: ${key}`);
        continue;
      }

      console.log(`\n⚠️ Script detected: ${key}`);
      console.log(`Command: ${s.command}`);

      const result = runInSandbox(
        s.command,
        sandboxPath,
        s.relativePath
      );

      console.log("---- Output ----");
      console.log(result.stdout || result.stderr);
      console.log(result.status === 0 ? "Script executed successfully" : "Script execution failed");

      const decision = await askUser(
        "Allow this script? (y/n/always): "
      );

      if (decision === "always" || decision === "y") {
        if (decision === "always") {
          trust[key] = "allow";
        }

        console.log(`Running ${key} in real environment...`);

        execSync(`npm rebuild ${s.name}`, {
          stdio: "inherit"
        });
      }
    }
  } finally {
    cleanupSandbox(sandboxPath);
  }

  saveTrust(trust);
}