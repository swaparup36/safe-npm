import { spawnSync } from "child_process";
import path from "path";
import fs from "fs";
import { analyzeScript } from "./codeAnalyzer.js";
import { analyzeSyscalls } from "./syscallAnalyzer.js";

function canUseFirejail() {
  if (process.platform !== "linux") return false;

  const check = spawnSync("firejail", ["--version"], {
    encoding: "utf-8"
  });

  return !check.error && check.status === 0;
}
const FIREJAIL_AVAILABLE = canUseFirejail();

function runDirect(script, cwd) {
  return spawnSync(script, {
    cwd,
    encoding: "utf-8",
    shell: true
  });
}

export function runInSandbox(script, sandboxPath, relativePath, meta) {
  console.log(`🔒 Running in sandbox: ${relativePath}`);

  const cwd = path.join(sandboxPath, relativePath);

  console.log(`Executing script: ${script}`);

  const parts = script.match(/[^\s"]+|"([^"]*)"/g) || [];
  const scriptFile = parts.find(p => p.endsWith(".js"));
  const scriptPath = scriptFile
    ? path.join(cwd, scriptFile.replace(/"/g, ""))
    : null;

  if (!scriptPath) {
    console.warn("Could not determine script file from command: ", script);
  }

  if (scriptPath) {
    console.log(`Resolved script path: ${scriptPath}`);
  }

  // Scan the script to detect if it contains any suspicious patterns before execution
  let scriptContent = null;

  if (scriptFile) {
    scriptContent = readScriptFile(cwd, scriptFile.replace(/"/g, ""));
  } else {
    console.warn("Skipping static analysis (no script file detected)");
  }

  if (scriptFile && !scriptContent) {
    console.error(`Failed to read script file: ${scriptPath}`);
  }

  let preExecutionFindings = [];

  if (scriptContent) {
    preExecutionFindings = analyzeScript(scriptContent, scriptPath);

    if (preExecutionFindings.length > 0) {
      console.warn(`⚠️ Suspicious patterns detected in script ${relativePath}:`);
      preExecutionFindings.forEach(f => console.warn(f));
    } else {
      console.log(`No suspicious patterns detected in script: ${relativePath}`);
    }
  }

  let result;

  const safe = str => str.replace(/[^a-zA-Z0-9]/g, "_");
  const traceFile = `/tmp/dg-${safe(meta.package || "unknown")}-${safe(meta.hook || "unknown")}-${Date.now()}.log`;

  const straceContext = {
    package: meta.package || "unknown",
    hook: meta.hook || "unknown",
    script: script,
    traceFile
  };
  
  if (FIREJAIL_AVAILABLE) {
    result = spawnSync(
      "firejail",
      [
        "--quiet",
        "--net=none",
        "--private",
        "--rlimit-cpu=5",
        "--rlimit-as=500000000",

        "strace",
        "-f",
        "-e",
        "trace=connect,execve,open",
        "-o",
        traceFile,

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

  if (result.error) {
    console.error("Execution failed:", result.error);
  }

  if (result.status !== 0) {
    console.warn(`Script exited with status ${result.status}`);
  }

  let syscallLogs = "";

  try {
    syscallLogs = fs.readFileSync(traceFile, "utf-8");
  } catch {
    console.warn("Could not read strace log");
  }

  const findings = analyzeSyscalls(syscallLogs, straceContext);

  if (findings.length > 0) {
    console.warn("\n🚨 Suspicious runtime behavior detected:");
    findings.forEach(f => console.warn(f));
  }

  try {
    fs.unlinkSync(traceFile);
  } catch {}

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