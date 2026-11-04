// Run with: node --experimental-strip-types tests/dates-csv.test.mts
import assert from "node:assert/strict";
import { isoDateOf } from "../lib/dates.ts";
import { toCsv, type Application } from "../lib/productivity.ts";
import { parseNumber } from "../lib/student.ts";
import { newId } from "../lib/ids.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`ok - ${name}`); };

test("isoDateOf uses local calendar fields with zero padding", () => {
  assert.equal(isoDateOf(new Date(2026, 0, 5)), "2026-01-05");
  assert.equal(isoDateOf(new Date(2026, 10, 1, 23, 59)), "2026-11-01");
});

test("toCsv quotes fields, escapes quotes, and guards formula injection", () => {
  const apps: Application[] = [{
    id: "1", company: 'Acme, "Ltd"', role: "=HYPERLINK(x)", status: "Applied",
    appliedOn: "2026-10-01", link: "https://acme.test/j", notes: "line1",
  }];
  const csv = toCsv(apps);
  const [header, row] = csv.split("\r\n");
  assert.equal(header, '"Company","Role","Status","Applied on","Link","Notes"');
  assert.equal(row, '"Acme, ""Ltd""","\'=HYPERLINK(x)","Applied","2026-10-01","https://acme.test/j","line1"');
});

test("toCsv with no applications still returns the header", () => {
  assert.equal(toCsv([]).split("\r\n").length, 1);
});

test("parseNumber handles blanks, whitespace and non-numbers", () => {
  assert.equal(parseNumber("  12.5 "), 12.5);
  assert.equal(parseNumber(""), null);
  assert.equal(parseNumber("abc"), null);
  assert.equal(parseNumber("Infinity"), null);
});

test("newId returns distinct values", () => {
  const ids = new Set(Array.from({ length: 1000 }, () => newId()));
  assert.equal(ids.size, 1000);
});

console.log(`\n${passed} tests passed`);
