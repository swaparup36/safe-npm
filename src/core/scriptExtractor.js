import fs from "fs";
import path from "path";

const LIFECYCLE_HOOKS = ["preinstall", "install", "postinstall"];

export function getLifecycleScripts() {
  const nodeModules = path.join(process.cwd(), "node_modules");
  const scripts = [];

  if (!fs.existsSync(nodeModules)) {
    return scripts;
  }

  const scriptSeen = new Set();
  const packageDirs = getAllInstalledPackageDirs(nodeModules);
  for (const packageDir of packageDirs) {
    addScriptsFromPackageDir(packageDir, scripts, scriptSeen);
  }

  return scripts;
}

export function getLifecycleScriptsForSpecificPackages(packages) {
  const scripts = [];
  const scriptSeen = new Set();
  const visitedPackageDirs = new Set();

  for (const pkg of packages) {
    const rootPackageDir = resolveDependencyDir(pkg, process.cwd());
    if (!rootPackageDir) continue;

    traverseDependencyGraph(rootPackageDir, scripts, scriptSeen, visitedPackageDirs);
  }

  return scripts;
}

function getAllInstalledPackageDirs(rootNodeModules) {
  const packageDirs = [];
  const nodeModulesStack = [rootNodeModules];

  while (nodeModulesStack.length > 0) {
    const currentNodeModules = nodeModulesStack.pop();
    if (!currentNodeModules || !fs.existsSync(currentNodeModules)) continue;

    const directPackageDirs = getDirectPackageDirs(currentNodeModules);
    for (const packageDir of directPackageDirs) {
      packageDirs.push(packageDir);

      const nestedNodeModules = path.join(packageDir, "node_modules");
      if (fs.existsSync(nestedNodeModules)) {
        nodeModulesStack.push(nestedNodeModules);
      }
    }
  }

  return packageDirs;
}

function getDirectPackageDirs(nodeModulesDir) {
  const dirs = [];
  const entries = fs.readdirSync(nodeModulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name === ".bin") continue;

    const entryPath = path.join(nodeModulesDir, entry.name);
    if (entry.name.startsWith("@")) {
      const scopedEntries = fs.readdirSync(entryPath, { withFileTypes: true });
      for (const scopedEntry of scopedEntries) {
        if (!scopedEntry.isDirectory()) continue;

        const packageDir = path.join(entryPath, scopedEntry.name);
        if (fs.existsSync(path.join(packageDir, "package.json"))) {
          dirs.push(packageDir);
        }
      }
      continue;
    }

    if (fs.existsSync(path.join(entryPath, "package.json"))) {
      dirs.push(entryPath);
    }
  }

  return dirs;
}

function readPackageJsonSafe(packageDir) {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!fs.existsSync(packageJsonPath)) return null;

  try {
    return JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  } catch {
    return null;
  }
}

function addScriptsFromPackageDir(packageDir, scripts, scriptSeen) {
  const data = readPackageJsonSafe(packageDir);
  if (!data || !data.scripts) return;

  for (const hook of LIFECYCLE_HOOKS) {
    if (!data.scripts[hook]) continue;

    const key = `${packageDir}:${hook}`;
    if (scriptSeen.has(key)) continue;
    scriptSeen.add(key);

    scripts.push({
      name: data.name,
      hook,
      command: data.scripts[hook],
      relativePath: path.relative(process.cwd(), packageDir)
    });
  }
}

function resolveDependencyDir(packageName, startDir) {
  let currentDir = startDir;

  while (true) {
    const candidateDir = path.join(currentDir, "node_modules", packageName);
    if (fs.existsSync(path.join(candidateDir, "package.json"))) {
      return candidateDir;
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }
    currentDir = parentDir;
  }
}

function traverseDependencyGraph(rootPackageDir, scripts, scriptSeen, visitedPackageDirs) {
  const stack = [rootPackageDir];

  while (stack.length > 0) {
    const packageDir = stack.pop();
    if (!packageDir || visitedPackageDirs.has(packageDir)) continue;
    visitedPackageDirs.add(packageDir);

    const data = readPackageJsonSafe(packageDir);
    if (!data) continue;

    addScriptsFromPackageDir(packageDir, scripts, scriptSeen);

    const deps = {
      ...(data.dependencies || {}),
      ...(data.optionalDependencies || {})
    };

    for (const depName of Object.keys(deps)) {
      const depDir = resolveDependencyDir(depName, packageDir);
      if (depDir) {
        stack.push(depDir);
      }
    }
  }
}