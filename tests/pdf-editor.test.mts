// Run with: node --experimental-strip-types tests/pdf-editor.test.mts
// Uses pdf-lib and pdf.js from node_modules, and pdftoppm / qpdf / python3 (PIL) when present.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  normaliseRotation, viewToDisplay, displayToView, displaySize, displayRectOfView, viewToPdf, textItemToViewRect,
} from "../lib/pdf-editor-geometry.ts";
import {
  EMPTY_DOC, appendSource, rotatePage, movePage, deletePages, insertBlankPage, addAnnotation, updateAnnotation,
  removeAnnotation, translateAnnotation, annotationBounds, createHistory, commit, undo, redo, PAGE_SIZES, totalRotation, type EditorDoc,
} from "../lib/pdf-editor-state.ts";
import { exportEditedPdf, EditorExportError } from "../lib/pdf-editor-export.ts";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "toolora-editor-"));
const has = (b: string) => spawnSync("which", [b]).status === 0;
let passed = 0;
let failures = 0;

async function makeSource(texts: string[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const t of texts) {
    const page = doc.addPage([612, 792]);
    page.drawText(t, { x: 72, y: 700, size: 24, font, color: rgb(0, 0, 0) });
  }
  return doc.save();
}

const tests: [string, () => void | Promise<void>][] = [
  ["rotation normalises to 0/90/180/270", () => {
    assert.equal(normaliseRotation(-90), 270);
    assert.equal(normaliseRotation(450), 90);
    assert.equal(normaliseRotation(0), 0);
  }],
  ["display ↔ view mapping is an exact inverse for every rotation", () => {
    const view = { w: 300, h: 400 };
    for (const rot of [0, 90, 180, 270] as const) {
      for (const p of [{ x: 0, y: 0 }, { x: 120, y: 33 }, { x: 300, y: 400 }]) {
        const back = displayToView(viewToDisplay(p, view, rot), view, rot);
        assert.ok(Math.abs(back.x - p.x) < 1e-9 && Math.abs(back.y - p.y) < 1e-9, `rot ${rot} ${JSON.stringify(p)}`);
      }
    }
  }],
  ["display size swaps for 90 and 270 degrees", () => {
    assert.deepEqual(displaySize({ w: 300, h: 400 }, 90), { w: 400, h: 300 });
    assert.deepEqual(displaySize({ w: 300, h: 400 }, 180), { w: 300, h: 400 });
  }],
  ["viewToPdf flips y and applies the media box origin", () => {
    assert.deepEqual(viewToPdf({ x: 10, y: 20 }, { x0: 0, y0: 0, x1: 612, y1: 792 }), { x: 10, y: 772 });
  }],
  ["text items from pdf.js convert to view rectangles", () => {
    const r = textItemToViewRect(72, 700, 100, 20, { x0: 0, y0: 0, x1: 612, y1: 792 });
    assert.deepEqual(r, { x: 72, y: 72, w: 100, h: 20 });
  }],
  ["page operations: rotate, move, delete (keeps one page), blank insert", () => {
    let d: EditorDoc = appendSource(EMPTY_DOC, { id: "s", name: "a.pdf", pageCount: 3 }, [
      { id: "a", index: 0, view: { w: 612, h: 792 }, baseRotation: 0 },
      { id: "b", index: 1, view: { w: 612, h: 792 }, baseRotation: 90 },
      { id: "c", index: 2, view: { w: 612, h: 792 }, baseRotation: 0 },
    ]);
    d = rotatePage(d, "a", -1);
    assert.equal(totalRotation(d.pages[0]), 270);
    assert.equal(totalRotation(d.pages[1]), 90, "base rotation is kept");
    d = movePage(d, 2, 0);
    assert.deepEqual(d.pages.map((p) => p.id), ["c", "a", "b"]);
    const refused = deletePages(d, ["a", "b", "c"]);
    assert.ok(refused.error, "cannot delete every page");
    const ok = deletePages(d, ["a"]);
    assert.equal(ok.doc.pages.length, 2);
    d = insertBlankPage(d, 0, PAGE_SIZES.A4, "blank1");
    assert.equal(d.pages[1].id, "blank1");
    assert.equal(d.pages[1].source, "blank");
  }],
  ["annotations: add, update, remove, and original pages are not mutated", () => {
    const base = appendSource(EMPTY_DOC, { id: "s", name: "a.pdf", pageCount: 1 }, [{ id: "a", index: 0, view: { w: 612, h: 792 }, baseRotation: 0 }]);
    const withNote = addAnnotation(base, "a", { id: "n1", kind: "note", x: 10, y: 10, text: "hi", color: "#FFE066" });
    assert.equal(base.pages[0].anns.length, 0, "previous state untouched");
    const moved = updateAnnotation(withNote, "a", "n1", { x: 99 } as never);
    assert.equal((moved.pages[0].anns[0] as { x: number }).x, 99);
    assert.equal(removeAnnotation(moved, "a", "n1").pages[0].anns.length, 0);
  }],
  ["translateAnnotation moves every annotation kind by the same delta", () => {
    const moved = translateAnnotation({ id: "l", kind: "line", x1: 0, y1: 0, x2: 10, y2: 5, width: 1, color: "#000000" }, 5, 7);
    assert.deepEqual([moved.kind === "line" && moved.x1, moved.kind === "line" && moved.y2], [5, 12]);
    const ink = translateAnnotation({ id: "i", kind: "ink", points: [{ x: 1, y: 1 }], width: 1, color: "#000000" }, 2, 3);
    assert.deepEqual(ink.kind === "ink" && ink.points[0], { x: 3, y: 4 });
    const rect = translateAnnotation({ id: "r", kind: "rect", x: 10, y: 10, w: 4, h: 4, width: 1, fill: false, color: "#000000" }, -10, 0);
    assert.equal(rect.kind === "rect" && rect.x, 0);
  }],
  ["annotationBounds gives sensible boxes", () => {
    assert.deepEqual(annotationBounds({ id: "i", kind: "ink", points: [{ x: 5, y: 9 }, { x: 1, y: 2 }], width: 1, color: "#000000" }), { x: 1, y: 2, w: 4, h: 7 });
    assert.equal(annotationBounds({ id: "n", kind: "note", x: 0, y: 0, text: "a", color: "#000000" }).w, 180);
  }],
  ["undo and redo walk back and forth through edits", () => {
    let h = createHistory(EMPTY_DOC);
    h = commit(h, { ...EMPTY_DOC, sources: [{ id: "x", name: "1", pageCount: 0 }] });
    h = commit(h, { ...EMPTY_DOC, sources: [{ id: "y", name: "2", pageCount: 0 }] });
    h = undo(h);
    assert.equal(h.present.sources[0].id, "x");
    h = undo(h);
    assert.equal(h.present.sources.length, 0);
    h = redo(h);
    assert.equal(h.present.sources[0].id, "x");
    h = commit(h, EMPTY_DOC);
    assert.equal(h.future.length, 0, "a new edit clears redo");
  }],
  ["export keeps original text, adds annotation text, copies the right pages", async () => {
    const src = await makeSource(["Original Alpha", "Original Beta"]);
    let d = appendSource(EMPTY_DOC, { id: "src", name: "a.pdf", pageCount: 2 }, [
      { id: "p1", index: 0, view: { w: 612, h: 792 }, baseRotation: 0 },
      { id: "p2", index: 1, view: { w: 612, h: 792 }, baseRotation: 0 },
    ]);
    d = addAnnotation(d, "p1", { id: "t1", kind: "text", x: 72, y: 120, text: "Edited note", size: 16, font: "Helvetica", bold: true, color: "#FF0000" });
    d = rotatePage(d, "p2", 1);
    d = insertBlankPage(d, 1, PAGE_SIZES.A4, "blank");
    const bytes = await exportEditedPdf(d, { src }, {});
    const out = await PDFDocument.load(bytes);
    assert.equal(out.getPageCount(), 3);
    assert.equal(out.getPage(1).getRotation().angle, 90, "second page was rotated in the editor");
    assert.equal(out.getPage(2).getRotation().angle, 0, "blank page inserted after it is unrotated");
    const file = path.join(dir, "edited.pdf");
    fs.writeFileSync(file, bytes);
    if (has("qpdf")) execFileSync("qpdf", ["--check", file], { stdio: "pipe" });
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const pdoc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
    const text = async (n: number) => (await (await pdoc.getPage(n)).getTextContent()).items.map((i: { str: string }) => i.str).join(" ");
    assert.match(await text(1), /Original Alpha/);
    assert.match(await text(1), /Edited note/);
    assert.match(await text(2), /Original Beta/);
  }],
  ["export embeds a PNG image annotation", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=", "base64");
    let d = appendSource(EMPTY_DOC, { id: "s", name: "x", pageCount: 1 }, []);
    d = insertBlankPage(d, -1, PAGE_SIZES.Letter, "b");
    d = addAnnotation(d, "b", { id: "i", kind: "image", x: 10, y: 10, w: 100, h: 100, assetId: "img1", color: "#000000" });
    const bytes = await exportEditedPdf(d, {}, { img1: { bytes: new Uint8Array(png), type: "png" } });
    assert.ok((await PDFDocument.load(bytes)).getPageCount() === 1);
  }],
  ["export fails clearly for a missing source, an empty document, and unsupported text", async () => {
    await assert.rejects(exportEditedPdf(EMPTY_DOC, {}, {}), EditorExportError);
    const d = appendSource(EMPTY_DOC, { id: "s", name: "x", pageCount: 1 }, [{ id: "a", index: 0, view: { w: 612, h: 792 }, baseRotation: 0 }]);
    await assert.rejects(exportEditedPdf(d, {}, {}), /missing/);
    const bad = addAnnotation(insertBlankPage(EMPTY_DOC, -1, PAGE_SIZES.A4, "b"), "b", { id: "t", kind: "text", x: 0, y: 0, text: "नमस्ते", size: 12, font: "Helvetica", bold: false, color: "#000000" });
    await assert.rejects(exportEditedPdf(bad, {}, {}), (e: unknown) => e instanceof EditorExportError && /standard PDF fonts/.test((e as Error).message));
  }],
  ["export draws every annotation kind without error and the page stays readable", async () => {
    const src = await makeSource(["Base"]);
    const red = "#FF0000";
    let d = appendSource(EMPTY_DOC, { id: "src", name: "a.pdf", pageCount: 1 }, [{ id: "p", index: 0, view: { w: 612, h: 792 }, baseRotation: 0 }]);
    const anns: Parameters<typeof addAnnotation>[2][] = [
      { id: "1", kind: "cover", x: 60, y: 60, w: 200, h: 30, color: "#FFFFFF" },
      { id: "2", kind: "highlight", x: 60, y: 100, w: 200, h: 20, color: "#FFE066" },
      { id: "3", kind: "underline", x: 60, y: 130, w: 200, h: 20, color: red },
      { id: "4", kind: "strike", x: 60, y: 160, w: 200, h: 20, color: red },
      { id: "5", kind: "ink", points: [{ x: 60, y: 200 }, { x: 120, y: 240 }, { x: 180, y: 210 }], width: 2, color: red },
      { id: "6", kind: "rect", x: 60, y: 260, w: 120, h: 60, width: 2, fill: false, color: red },
      { id: "7", kind: "ellipse", x: 200, y: 260, w: 120, h: 60, width: 2, fill: true, color: "#2B4EFF" },
      { id: "8", kind: "line", x1: 60, y1: 340, x2: 300, y2: 360, width: 2, color: red },
      { id: "9", kind: "note", x: 60, y: 400, text: "Check this\nwith finance", color: "#FFE066" },
      { id: "10", kind: "text", x: 60, y: 520, text: "Bold Courier", size: 14, font: "Courier", bold: true, color: "#000000" },
    ];
    for (const a of anns) d = addAnnotation(d, "p", a);
    const bytes = await exportEditedPdf(d, { src }, {});
    assert.equal((await PDFDocument.load(bytes)).getPageCount(), 1);
  }],
  ["rectangles land where the geometry says, for every rotation (rasterised with pdftoppm)", async () => {
    if (!has("pdftoppm") || !has("python3")) return;
    const view = { w: 300, h: 400 };
    const rect = { x: 40, y: 60, w: 100, h: 50 };
    for (const rot of [0, 90, 180, 270] as const) {
      let d = insertBlankPage(EMPTY_DOC, -1, { w: view.w, h: view.h }, "b");
      d = addAnnotation(d, "b", { id: "r", kind: "rect", ...rect, color: "#FF0000", width: 1, fill: true });
      d = { ...d, pages: d.pages.map((p) => ({ ...p, userRotation: rot })) };
      const bytes = await exportEditedPdf(d, {}, {});
      const file = path.join(dir, `rect-${rot}.pdf`);
      fs.writeFileSync(file, bytes);
      execFileSync("pdftoppm", ["-r", "72", "-png", "-singlefile", file, path.join(dir, `rect-${rot}`)], { stdio: "pipe" });
      const found = execFileSync("python3", ["-c", `
from PIL import Image
im = Image.open(${JSON.stringify(path.join(dir, `rect-${rot}.png`))}).convert("RGB")
w, h = im.size
xs, ys = [], []
px = im.load()
for y in range(h):
    for x in range(w):
        r, g, b = px[x, y]
        if r > 200 and g < 60 and b < 60:
            xs.append(x); ys.append(y)
print(w, h, min(xs), min(ys), max(xs), max(ys))
`], { encoding: "utf8" }).trim().split(" ").map(Number);
      const [pw, ph, x0, y0, x1, y1] = found;
      const expected = displayRectOfView(rect, view, rot);
      const dims = displaySize(view, rot);
      assert.equal(pw, dims.w, `raster width at ${rot}`);
      assert.equal(ph, dims.h, `raster height at ${rot}`);
      assert.ok(Math.abs(x0 - expected.x) <= 2 && Math.abs(y0 - expected.y) <= 2, `rot ${rot}: top-left ${x0},${y0} expected ${expected.x},${expected.y}`);
      assert.ok(Math.abs((x1 - x0) - expected.w) <= 3 && Math.abs((y1 - y0) - expected.h) <= 3, `rot ${rot}: size ${x1 - x0}x${y1 - y0} expected ${expected.w}x${expected.h}`);
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
