// Run with: node --experimental-strip-types tests/logic.test.mts
import assert from "node:assert/strict";
import { parsePageRanges } from "../lib/page-ranges.ts";
import {
  formatBytes,
  percentSaved,
  validateFiles,
  outputName,
  computeDimensions,
} from "../lib/files.ts";

let passed = 0;
function test(name: string, fn: () => void) {
  fn();
  passed++;
  console.log(`ok - ${name}`);
}

// ---- page ranges
test("parses single pages and ranges", () => {
  assert.deepEqual(parsePageRanges("1-3, 5, 7-9", 10), {
    ranges: [
      { start: 1, end: 3 },
      { start: 5, end: 5 },
      { start: 7, end: 9 },
    ],
  });
});
test("rejects empty input", () => {
  assert.ok("error" in parsePageRanges("   ", 5));
});
test("rejects out-of-bounds pages", () => {
  assert.ok("error" in parsePageRanges("1-6", 5));
  assert.ok("error" in parsePageRanges("0", 5));
});
test("rejects reversed ranges", () => {
  assert.ok("error" in parsePageRanges("5-2", 10));
});
test("rejects stray commas and junk", () => {
  assert.ok("error" in parsePageRanges("1,,2", 5));
  assert.ok("error" in parsePageRanges("abc", 5));
  assert.ok("error" in parsePageRanges("1.5", 5));
});

// ---- formatting
test("formatBytes", () => {
  assert.equal(formatBytes(0), "0 B");
  assert.equal(formatBytes(512), "512 B");
  assert.equal(formatBytes(1536), "1.5 KB");
  assert.equal(formatBytes(20 * 1024 * 1024), "20 MB");
});
test("percentSaved", () => {
  assert.equal(percentSaved(1000, 250), 75);
  assert.equal(percentSaved(100, 150), -50);
  assert.equal(percentSaved(0, 10), 0);
});

// ---- validation
const rules = { accept: ["image/"], maxBytes: 1000, maxCount: 2 };
test("validateFiles accepts good files", () => {
  assert.equal(validateFiles([{ name: "a.png", type: "image/png", size: 10 }], rules), null);
});
test("validateFiles rejects wrong type", () => {
  assert.match(validateFiles([{ name: "a.pdf", type: "application/pdf", size: 10 }], rules)!, /not a supported/);
});
test("validateFiles rejects too many files", () => {
  const f = { name: "a.png", type: "image/png", size: 10 };
  assert.match(validateFiles([f, f, f], rules)!, /up to 2/);
});
test("validateFiles rejects oversize and empty files", () => {
  assert.match(validateFiles([{ name: "a.png", type: "image/png", size: 2000 }], rules)!, /larger than/);
  assert.match(validateFiles([{ name: "a.png", type: "image/png", size: 0 }], rules)!, /empty/);
});
test("validateFiles requires at least one file", () => {
  assert.match(validateFiles([], rules)!, /Choose at least one/);
});
test("validateFiles honours exact MIME types", () => {
  const pdfOnly = { accept: ["application/pdf"], maxBytes: 1000, maxCount: 5 };
  assert.equal(validateFiles([{ name: "a.pdf", type: "application/pdf", size: 5 }], pdfOnly), null);
  assert.ok(validateFiles([{ name: "a.png", type: "image/png", size: 5 }], pdfOnly));
});

// ---- naming
test("outputName keeps base name and replaces extension", () => {
  assert.equal(outputName("photo.final.jpg", "-compressed", "jpg"), "photo.final-compressed.jpg");
  assert.equal(outputName("noext", "", "png"), "noext.png");
});

// ---- dimensions
test("computeDimensions keeps source when nothing entered", () => {
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { lockAspect: true }), { width: 400, height: 300 });
});
test("computeDimensions derives height from width when locked", () => {
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { width: 200, lockAspect: true }), { width: 200, height: 150 });
});
test("computeDimensions derives width from height when locked", () => {
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { height: 150, lockAspect: true }), { width: 200, height: 150 });
});
test("computeDimensions uses both values when unlocked", () => {
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { width: 100, height: 100, lockAspect: false }), { width: 100, height: 100 });
});
test("computeDimensions clamps to valid range", () => {
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { width: 0, lockAspect: false }), { width: 1, height: 300 });
  assert.deepEqual(computeDimensions({ width: 400, height: 300 }, { width: 99999, lockAspect: false }), { width: 10000, height: 300 });
});

console.log(`\n${passed} tests passed`);

// ---- contact validation (appended)
import { validateContact, looksLikeEmail } from "../lib/contact.ts";
test("looksLikeEmail accepts and rejects sensible values", () => {
  assert.equal(looksLikeEmail("name@example.com"), true);
  assert.equal(looksLikeEmail("name@example"), false);
  assert.equal(looksLikeEmail("no at sign"), false);
});
test("validateContact reports every problem", () => {
  const errs = validateContact({ name: " ", email: "bad", message: "short" });
  assert.ok(errs.name && errs.email && errs.message);
});
test("validateContact passes a good message", () => {
  assert.deepEqual(validateContact({ name: "Ada", email: "ada@x.io", message: "Hello there, friend." }), {});
});
console.log("contact tests passed");
