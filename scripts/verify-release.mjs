// Runs the full release verification and writes VERIFICATION-REPORT.md with the REAL exit code
// of every command. A step is only reported as PASS when its command exits with code 0.
// Usage: node scripts/verify-release.mjs   (needs network access for npm install)
import { cpSync, mkdtempSync, existsSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function run(label, cmd, args, cwd, extraEnv = {}) {
  const started = new Date().toISOString();
  const res = spawnSync(cmd, args, { cwd, encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, ...extraEnv }, maxBuffer: 64 * 1024 * 1024 });
  const exit = res.status === null ? `signal ${res.signal}` : res.status;
  const output = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  results.push({ label, command: `${cmd} ${args.join(" ")}`, cwd, started, exit, ok: res.status === 0, tail: output.trim().split("\n").slice(-25).join("\n") });
  console.log(`${res.status === 0 ? "PASS" : "FAIL"}  [exit ${exit}]  ${label}`);
  return res.status === 0;
}

// 1. Install from the registry, which creates package-lock.json.
const installed = run("npm install (creates package-lock.json)", "npm", ["install", "--no-audit", "--no-fund"], root);
const lockExists = existsSync(path.join(root, "package-lock.json"));
results.push({ label: "package-lock.json exists after install", command: "file check", cwd: root, exit: lockExists ? 0 : 1, ok: lockExists, tail: lockExists ? "present" : "absent" });
console.log(`${lockExists ? "PASS" : "FAIL"}  [exit ${lockExists ? 0 : 1}]  package-lock.json exists after install`);

// 2. Clean copy: npm ci must install exactly the lockfile with no changes to the project.
const tmp = mkdtempSync(path.join(os.tmpdir(), "toolora-ci-"));
const cleanCopy = path.join(tmp, "toolora");
cpSync(root, cleanCopy, { recursive: true, filter: (src) => !/[\\/](node_modules|\.next)([\\/]|$)/.test(src) });
run("npm ci on a clean copy", "npm", ["ci", "--no-audit", "--no-fund"], cleanCopy);

// 3. The checks themselves, run in the project.
if (installed) {
  run("npm test (10 test files)", "npm", ["test"], root);
  run("npm run typecheck", "npm", ["run", "typecheck"], root);
  run("npm run build", "npm", ["run", "build"], root, { NEXT_TELEMETRY_DISABLED: "1" });
} else {
  for (const label of ["npm test (10 test files)", "npm run typecheck", "npm run build"]) {
    results.push({ label, command: "(not run)", cwd: root, exit: "not run", ok: false, tail: "Skipped because npm install did not succeed." });
    console.log(`FAIL  [not run]  ${label}`);
  }
}

rmSync(tmp, { recursive: true, force: true });

const allOk = results.every((r) => r.ok);
const lines = [
  "# Toolora verification report",
  "",
  `Generated: ${new Date().toISOString()}`,
  `Node: ${process.version}  npm: ${spawnSync("npm", ["-v"], { encoding: "utf8", shell: process.platform === "win32" }).stdout.trim()}`,
  "",
  `**Overall: ${allOk ? "ALL STEPS PASSED (every command exited with code 0)" : "NOT RELEASE-READY: at least one step did not exit with code 0"}**`,
  "",
  "| Step | Exit | Result |",
  "|---|---|---|",
  ...results.map((r) => `| ${r.label} | ${r.exit} | ${r.ok ? "PASS" : "FAIL"} |`),
  "",
];
for (const r of results) {
  lines.push(`## ${r.label}`, "", `Command: \`${r.command}\` in \`${r.cwd === root ? "project" : "clean copy"}\``, `Exit code: ${r.exit}`, "", "```", r.tail || "(no output)", "```", "");
}
writeFileSync(path.join(root, "VERIFICATION-REPORT.md"), lines.join("\n"));
console.log(`\nReport written to VERIFICATION-REPORT.md. Overall: ${allOk ? "PASS" : "FAIL"}`);
process.exit(allOk ? 0 : 1);
