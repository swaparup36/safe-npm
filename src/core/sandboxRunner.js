import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { analyzeScript } from "./codeAnalyzer.js";

function canUseFirejail() {
  if (process.platform !== "linux") return false;

  const check = spawnSync("firejail", ["--version"], {
    encoding: "utf-8"
  });

  return !check.error && check.status === 0;
}

function runDirect(script, cwd) {
  return spawnSync(script, {
    cwd,
    encoding: "utf-8",
    shell: true
  });
}

export function runInSandbox(script, sandboxPath, relativePath) {
  console.log(`🔒 Running in sandbox: ${relativePath}`);

  const cwd = path.join(sandboxPath, relativePath);

  console.log(`Executing script: ${script}`);
  const scriptPath = path.join(cwd, script.split(" ")[1]);
  console.log(`Resolved script path: ${scriptPath}`);

  // Scan the script to detect if it contains any suspicious patterns before execution
  const scriptContent = readScriptFile(cwd, script.split(" ")[1]);
  if (!scriptContent) {
    console.error(`Failed to read script file: ${scriptPath}`);
    return { stdout: "", stderr: "Failed to read script file", status: 1 };
  }

  const preExecutionFindings = analyzeScript(scriptContent, scriptPath);
  if (preExecutionFindings.length > 0) {
    console.warn(`⚠️ Suspicious patterns detected in script ${relativePath}:`);
    preExecutionFindings.forEach(f => console.warn(f));
  } else {
    console.log(`No suspicious patterns detected in script: ${relativePath}`);
  }

  let result;

  if (canUseFirejail()) {
    result = spawnSync(
      "firejail",
      [
        "--quiet",
        "--net=none",
        "--private",
        "bash",
        "-c",
        script
      ],
      {
        cwd,
        encoding: "utf-8"
      }
    );
  } else {
    console.log(
      "⚠️ firejail is unavailable on this platform. Running script without Linux sandbox isolation."
    );
    result = runDirect(script, cwd);
  }

  // console.log(`Sandbox execution completed: ${Object.keys(result).join(", ")}`);
  // console.log("error: ", result.error);
  // console.log("stdout: ", result.stdout);
  // console.log("stderr: ", result.stderr);
  // console.log("status: ", result.status);
  // console.log("output: ", result.output);
  // console.log("pid: ", result.pid);
  // console.log("signal: ", result.signal);

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    status: result.status
  };
}

function readScriptFile(basePath, file) {
  const fullPath = path.join(basePath, file);

  if (!fs.existsSync(fullPath)) return null;

  return fs.readFileSync(fullPath, "utf-8");
}