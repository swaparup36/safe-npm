import fs from "fs";

const TRUST_FILE = ".snpm/trust.json";

export function loadTrust() {
  if (!fs.existsSync(TRUST_FILE)) return {};
  return JSON.parse(fs.readFileSync(TRUST_FILE));
}

export function saveTrust(data) {
  fs.mkdirSync(".snpm", { recursive: true });
  fs.writeFileSync(TRUST_FILE, JSON.stringify(data, null, 2));
}