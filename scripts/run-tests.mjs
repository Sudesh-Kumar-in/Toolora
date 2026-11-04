// Runs every test file in tests/ with Node's built-in TypeScript type stripping.
import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(path.join(root, "tests")).filter((f) => /\.test\.m?ts$/.test(f)).sort();

let failed = 0;
for (const f of files) {
  const res = spawnSync(
    process.execPath,
    ["--experimental-strip-types", "--disable-warning=MODULE_TYPELESS_PACKAGE_JSON", path.join("tests", f)],
    { cwd: root, encoding: "utf8" },
  );
  const summary = (res.stdout || "").trim().split("\n").filter(Boolean).slice(-1)[0] ?? "";
  console.log(`${res.status === 0 ? "PASS" : "FAIL"}  ${f}  ${summary}`);
  if (res.status !== 0) {
    failed++;
    console.log(res.stdout + res.stderr);
  }
}
console.log(`\n${files.length - failed}/${files.length} test files passed`);
process.exit(failed ? 1 : 0);
