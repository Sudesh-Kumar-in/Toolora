// Run with: node --experimental-strip-types tests/pdf.test.mts
// Uses the real qpdf binary (if installed) and the real pdf.js and pdf-lib packages.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { Packer } from "docx";
import { buildEncryptArgs, buildDecryptArgs, buildIsEncryptedArgs } from "../lib/qpdf-args.ts";
import { groupIntoLines, groupIntoParagraphs, extractPages, textPagesToDocx } from "../lib/pdf-text.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toolora-pdf-"));
const hasQpdf = spawnSync("which", ["qpdf"]).status === 0;
const hasPandoc = spawnSync("which", ["pandoc"]).status === 0;
let passed = 0;
let failures = 0;

async function makeTextPdf(lines: { text: string; y: number; size: number }[], pages = 1): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let p = 0; p < pages; p++) {
    const page = doc.addPage([400, 500]);
    for (const l of lines) page.drawText(l.text, { x: 40, y: l.y, size: l.size, font });
  }
  return doc.save();
}

const tests: [string, () => void | Promise<void>][] = [
  ["qpdf encrypt -> wrong password fails (exit 2) -> right password decrypts", () => {
    if (!hasQpdf) return;
    const plain = path.join(dir, "plain.pdf");
    const locked = path.join(dir, "locked.pdf");
    const out = path.join(dir, "unlocked.pdf");
    fs.writeFileSync(plain, Buffer.from("placeholder"));
    // Build a real PDF file first.
    return (async () => {
      fs.writeFileSync(plain, await makeTextPdf([{ text: "Secret report", y: 450, size: 14 }]));
      execFileSync("qpdf", buildEncryptArgs("userpw", "ownerpw", plain, locked), { cwd: dir, stdio: "pipe" });
      assert.match(fs.readFileSync(locked).toString("latin1"), /\/Encrypt/);

      const bad = spawnSync("qpdf", buildDecryptArgs("wrong", locked, out), { cwd: dir, stdio: "pipe" });
      assert.equal(bad.status, 2, "wrong password should exit 2");

      execFileSync("qpdf", buildDecryptArgs("userpw", locked, out), { cwd: dir, stdio: "pipe" });
      const reread = await PDFDocument.load(fs.readFileSync(out));
      assert.equal(reread.getPageCount(), 1);
    })();
  }],
  ["qpdf --is-encrypted distinguishes locked from unlocked files", () => {
    if (!hasQpdf) return;
    const locked = path.join(dir, "locked.pdf");
    const plain = path.join(dir, "plain.pdf");
    const a = spawnSync("qpdf", buildIsEncryptedArgs(locked), { cwd: dir, stdio: "pipe" });
    const b = spawnSync("qpdf", buildIsEncryptedArgs(plain), { cwd: dir, stdio: "pipe" });
    assert.equal(a.status, 0);
    assert.equal(b.status, 2);
  }],
  ["groupIntoLines orders fragments into reading-order lines", () => {
    const lines = groupIntoLines([
      { str: "Hello", x: 40, y: 700, height: 12, width: 30 },
      { str: "World", x: 75, y: 700, height: 12, width: 30 },
      { str: "Next", x: 40, y: 680, height: 12, width: 24 },
      { str: "   ", x: 10, y: 600, height: 12 },
    ]);
    assert.deepEqual(lines.map((l) => l.text), ["Hello World", "Next"]);
    // Without measured widths, a fragment starting before the previous one ends is still
    // joined with no space: the estimate is only a fallback.
    const tight = groupIntoLines([
      { str: "Ab", x: 40, y: 700, height: 12 },
      { str: "Cd", x: 45, y: 700, height: 12 },
    ]);
    assert.equal(tight[0].text, "AbCd");
  }],
  ["groupIntoParagraphs splits on large vertical gaps only", () => {
    const paras = groupIntoParagraphs([
      { text: "Line one", y: 700, height: 12 },
      { text: "Line two", y: 686, height: 12 },
      { text: "New paragraph", y: 640, height: 12 },
    ]);
    assert.deepEqual(paras, ["Line one Line two", "New paragraph"]);
  }],
  ["extractPages reads real text from a real PDF via pdf.js", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const data = await makeTextPdf([
      { text: "Quarterly review", y: 450, size: 16 },
      { text: "Revenue grew steadily across all regions.", y: 420, size: 11 },
    ], 2);
    const result = await extractPages(data, pdfjs as never);
    assert.equal(result.pages.length, 2);
    assert.match(result.pages[0].join(" "), /Quarterly review/);
    assert.match(result.pages[0].join(" "), /Revenue grew steadily/);
    assert.ok(result.characterCount > 40);
  }],
  ["a blank (scanned-like) PDF yields no text", async () => {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await PDFDocument.create();
    doc.addPage([300, 300]);
    const result = await extractPages(await doc.save(), pdfjs as never);
    assert.equal(result.characterCount, 0);
  }],
  ["textPagesToDocx produces a Word file that pandoc reads back, with page breaks", async () => {
    const buf = await Packer.toBuffer(textPagesToDocx([["First page text"], ["Second page text"]], "Test"));
    const file = path.join(dir, "text.docx");
    fs.writeFileSync(file, buf);
    if (hasPandoc) {
      const out = execFileSync("pandoc", [file, "-t", "plain"], { encoding: "utf8" });
      assert.match(out, /First page text/);
      assert.match(out, /Second page text/);
    }
  }],
];

for (const [name, fn] of tests) {
  try {
    await fn();
    passed++;
    console.log(`ok - ${name}`);
  } catch (err) {
    failures++;
    console.log(`not ok - ${name}\n   ${(err as Error).message}`);
  }
}
console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
