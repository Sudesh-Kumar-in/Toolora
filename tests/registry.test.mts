// Run with: node --experimental-strip-types tests/registry.test.mts
// Checks the registry against the component map, using the source text so no bundling is needed.
import assert from "node:assert/strict";
import fs from "node:fs";

const tools = fs.readFileSync("lib/tools.ts", "utf8");
const index = fs.readFileSync("components/tools/index.tsx", "utf8");

const registrySlugs = [...tools.matchAll(/\{ slug: "([^"]+)"/g)].map((m) => m[1]);
const statuses = [...tools.matchAll(/status: "([^"]+)"/g)].map((m) => m[1]);
const componentKeys = [...index.matchAll(/^\s*"([a-z0-9-]+)": /gm)].map((m) => m[1]);

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`ok - ${name}`); };

test("registry lists exactly 39 tools with unique slugs", () => {
  assert.equal(registrySlugs.length, 39);
  assert.equal(new Set(registrySlugs).size, 39);
});
test("every tool has a registered component, and no component is orphaned", () => {
  assert.deepEqual([...new Set(componentKeys)].sort(), [...registrySlugs].sort());
});
test("every tool has an implemented status (no planned or coming-soon states)", () => {
  assert.equal(statuses.length, 39);
  for (const s of statuses) assert.ok(s === "beta" || s === "ready", `unexpected status ${s}`);
  assert.equal(/planned|coming/i.test(tools.split("ToolStatus =")[1]?.split("\n")[0] ?? ""), false);
});
test("no tool page or card shows a coming-soon or placeholder notice", () => {
  for (const f of ["components/tool-card.tsx", "app/tools/[slug]/page.tsx", "app/page.tsx", "app/about/page.tsx"]) {
    const src = fs.readFileSync(f, "utf8");
    assert.equal(/coming soon|still being built/i.test(src), false, `${f} still contains a coming-soon notice`);
  }
});

console.log(`\n${passed} tests passed`);
