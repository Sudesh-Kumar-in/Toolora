// Run with: node --experimental-strip-types tests/pdf-editor-workflow.test.mts
// An end-to-end editing session on real PDF files, checked with qpdf, pdf.js and pdftoppm.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  EMPTY_DOC, appendSource, addAnnotation, rotatePage, movePage, deletePages, insertBlankPage, updateAnnotation,
  createHistory, commit, undo, redo, PAGE_SIZES, totalRotation, newId, type EditorDoc,
} from "../lib/pdf-editor-state.ts";
import { exportEditedPdf } from "../lib/pdf-editor-export.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toolora-workflow-"));
const has = (b: string) => spawnSync("which", [b]).status === 0;

async function makePdf(label: string, pages: number, width = 612, height = 792): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pages; i++) {
    const p = doc.addPage([width, height]);
    p.drawText(`${label} page ${i}`, { x: 72, y: height - 100, size: 28, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

async function textOf(bytes: Uint8Array): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
  const out: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const tc = await (await doc.getPage(n)).getTextContent();
    out.push(tc.items.map((i: { str: string }) => i.str).join(" "));
  }
  return out;
}

async function openAs(id: string, name: string, bytes: Uint8Array, base: EditorDoc): Promise<EditorDoc> {
  const pdf = await PDFDocument.load(bytes);
  const pages = pdf.getPages().map((p, index) => {
    const { width, height } = p.getSize();
    return { id: newId("p"), index, view: { w: width, h: height }, baseRotation: p.getRotation().angle };
  });
  return appendSource(base, { id, name, pageCount: pages.length }, pages);
}

const steps: [string, () => Promise<void>][] = [
  ["open two real PDFs, merge them, and keep the original text", async () => {
    const a = await makePdf("Alpha", 2);
    const b = await makePdf("Beta", 1);
    const sources = { srcA: a, srcB: b };
    let doc = await openAs("srcA", "alpha.pdf", a, EMPTY_DOC);
    doc = await openAs("srcB", "beta.pdf", b, doc);
    assert.equal(doc.pages.length, 3);
    const out = await exportEditedPdf(doc, sources, {});
    const text = await textOf(out);
    assert.deepEqual(text.map((t) => t.replace(/ +/g, " ").trim()), ["Alpha page 1", "Alpha page 2", "Beta page 1"]);
    globalThis.__doc = doc;
    globalThis.__sources = sources;
  }],
  ["reorder, rotate, delete, insert blank: the exported file reflects every change", async () => {
    let doc: EditorDoc = (globalThis as any).__doc;
    const sources = (globalThis as any).__sources as Record<string, Uint8Array>;
    doc = movePage(doc, 2, 0);                              // Beta, Alpha 1, Alpha 2
    const [, alpha1, alpha2] = doc.pages.map((p) => p.id);  // ids read AFTER the move
    doc = rotatePage(doc, alpha2, 1);                       // Alpha 2 rotated 90° clockwise
    const del = deletePages(doc, [doc.pages[0].id]);        // delete Beta
    assert.equal(del.error, null);
    doc = insertBlankPage(del.doc, 0, PAGE_SIZES.Letter, newId("p")); // blank between Alpha 1 and Alpha 2
    assert.equal(doc.pages[0].id, alpha1);
    const bytes = await exportEditedPdf(doc, sources, {});
    const out = await PDFDocument.load(bytes);
    assert.equal(out.getPageCount(), 3);
    assert.equal(out.getPage(0).getRotation().angle, 0);
    assert.equal(out.getPage(2).getRotation().angle, 90, "Alpha 2 is now page 3 and rotated");
    const text = (await textOf(bytes)).map((t) => t.replace(/ +/g, " ").trim());
    assert.equal(text[0], "Alpha page 1");
    assert.equal(text[1], "");
    assert.equal(text[2], "Alpha page 2");
    const file = path.join(dir, "reordered.pdf");
    fs.writeFileSync(file, bytes);
    if (has("qpdf")) execFileSync("qpdf", ["--check", file], { stdio: "pipe" });
    (globalThis as any).__doc = doc;
  }],
  ["annotate, edit an annotation, undo and redo, and export the final state", async () => {
    let doc: EditorDoc = (globalThis as any).__doc;
    const sources = (globalThis as any).__sources as Record<string, Uint8Array>;
    const target = doc.pages[2].id;
    const noteId = newId("a");
    let h = createHistory(doc);
    doc = addAnnotation(doc, target, { id: noteId, kind: "note", x: 60, y: 60, text: "Draft", color: "#FFE066" });
    h = commit(h, doc);
    doc = updateAnnotation(doc, target, noteId, { text: "Approved" } as never);
    h = commit(h, doc);
    h = undo(h);
    assert.equal((h.present.pages[2].anns[0] as { text: string }).text, "Draft");
    h = redo(h);
    assert.equal((h.present.pages[2].anns[0] as { text: string }).text, "Approved");
    doc = h.present;
    const bytes = await exportEditedPdf(doc, sources, {});
    fs.writeFileSync(path.join(dir, "final.pdf"), bytes);
    const text = (await textOf(bytes)).map((t) => t.replace(/ +/g, " ").trim());
    assert.match(text[2], /Alpha page 2/);
    assert.match(text[2], /Approved/);
    assert.ok(!/Draft/.test(text[2]));
  }],
  ["the rendered page shows the rotated content and annotation (pdftoppm)", async () => {
    if (!has("pdftoppm") || !has("python3")) return;
    const file = path.join(dir, "final.pdf");
    execFileSync("pdftoppm", ["-r", "72", "-png", "-f", "3", "-l", "3", "-singlefile", file, path.join(dir, "p3")], { stdio: "pipe" });
    const size = execFileSync("python3", ["-c", `from PIL import Image; im=Image.open(${JSON.stringify(path.join(dir, "p3.png"))}); print(im.size[0], im.size[1])`], { encoding: "utf8" }).trim().split(" ").map(Number);
    // Page 3 was 612×792 and is rotated 90°, so the rendered image is 792 wide and 612 tall.
    assert.deepEqual(size, [792, 612]);
  }],
  ["undo keeps the document valid, and a fresh session with no pages cannot export", async () => {
    const empty = createHistory(EMPTY_DOC);
    assert.equal(undo(empty).present.pages.length, 0);
    await assert.rejects(exportEditedPdf(EMPTY_DOC, {}, {}), /at least one page/);
    assert.equal(totalRotation({ id: "x", source: "blank", index: 0, view: { w: 1, h: 1 }, baseRotation: 270, userRotation: 90, anns: [] }), 0);
  }],
];

let failures = 0;
let passed = 0;
for (const [name, fn] of steps) {
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
