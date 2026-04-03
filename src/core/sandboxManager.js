import fs from "fs";
import path from "path";
import os from "os";

export function createSandbox() {
  const sandboxPath = path.join(
    os.tmpdir(),
    `dg-sandbox-${Date.now()}`
  );

  fs.mkdirSync(sandboxPath, { recursive: true });

  console.log("📂 Creating sandbox at:", sandboxPath);

  // Copy current working directory contents into the sandbox path
  for (const entry of fs.readdirSync(process.cwd())) {
    const sourcePath = path.join(process.cwd(), entry);
    const destinationPath = path.join(sandboxPath, entry);

    fs.cpSync(sourcePath, destinationPath, {
      recursive: true,
      force: true
    });
  }

  return sandboxPath;
}

export function cleanupSandbox(sandboxPath) {
  console.log("🧹 Cleaning sandbox...");
  fs.rmSync(sandboxPath, { recursive: true, force: true });
}