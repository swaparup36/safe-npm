import path from "path";
import fs from "fs";

const regexPatterns = [
  /curl\s+[-\w]+?\s+["']?https?:\/\/[^\s"']+["']?/i,
  /wget\s+[-\w]+?\s+["']?https?:\/\/[^\s"']+["']?/i,
  /http:\/\/[^\s"']+/i,
  /https:\/\/[^\s"']+/i,
  /\.ssh/i,
  /id_rsa/i,
  /require\(['"]child_process['"]\)/i,
  /\b(exec|spawn|bash|sh)\b/i,
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
  /\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g
];

export function analyzeScript(code, scriptPath) {
  const findings = [];

  for (const regex of regexPatterns) {
    const matches = code.match(regex);
    if (matches) {
      const lineAndColumn = getLineAndColumn(code, matches[0]);
      findings.push(`⚠️ Detected: ${matches[0]} in script: ${scriptPath} at line ${lineAndColumn.line}, column ${lineAndColumn.column}`);
    }
  }

  // recursive analysis for require statements
  const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
  let match;
  while ((match = requireRegex.exec(code)) !== null) {
    const requiredPath = match[1];
    const fullPath = path.resolve(path.dirname(scriptPath), requiredPath);
    if (fs.existsSync(fullPath)) {
      const requiredContent = fs.readFileSync(fullPath, "utf-8");
      findings.push(...analyzeScript(requiredContent, fullPath));
    }
  }

  return findings;
}

function getLineAndColumn(code, pattern) {
  const index = code.indexOf(pattern);
  const lines = code.substring(0, index).split("\n");
  const line = lines.length;
  const column = lines[lines.length - 1].length + 1;
  return { line, column };
}