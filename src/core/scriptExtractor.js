import fs from "fs";
import path from "path";

export function getLifecycleScripts() {
  const nodeModules = path.join(process.cwd(), "node_modules");
  const packages = fs.readdirSync(nodeModules);

  const scripts = [];

  for (const pkg of packages) {
    const pkgPath = path.join(nodeModules, pkg, "package.json");

    if (!fs.existsSync(pkgPath)) continue;

    const data = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

    if (data.scripts) {
      ["preinstall", "install", "postinstall"].forEach((hook) => {
        if (data.scripts[hook]) {
          scripts.push({
            name: data.name,
            hook,
            command: data.scripts[hook],
            relativePath: path.relative(process.cwd(), path.dirname(pkgPath))
          });
        }
      });
    }
  }

  return scripts;
}