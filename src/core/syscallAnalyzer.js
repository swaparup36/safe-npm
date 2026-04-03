export function analyzeSyscalls(logs, context = {}) {
  const findings = [];

  if (logs.includes("connect(")) {
    findings.push(`Attempted network connection in ${context.package}.${context.hook}`);
  }

  if (logs.includes("execve(")) {
    findings.push(`Executed a shell command in ${context.package}.${context.hook}`);
  }

  if (logs.includes(".ssh")) {
    findings.push(`Tried accessing SSH keys in ${context.package}.${context.hook}`);
  }

  if (logs.includes("/etc/passwd")) {
    findings.push(`Accessed sensitive system file in ${context.package}.${context.hook}`);
  }

  return findings;
}