// Run with: node --experimental-strip-types tests/pdf-editor-geometry.test.mts
// Checks the coordinate mapping against pdf.js's own viewport maths, using real PDF pages.
import assert from "node:assert/strict";
import { PDFDocument } from "pdf-lib";
import {
  sourceToVisual, visualToSource, visualSize, visualRectToPdf, rotateRectCw, rotatePtCw, normaliseRot, type Rot,
} from "../lib/pdf-editor/geometry.ts";

let passed = 0;
const test = (name: string, fn: () => void | Promise<void>) => ({ name, fn });
const close = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

const W = 300, H = 400;
const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

const tests = [
  test("inverse mappings round-trip for every rotation", () => {
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      const p = { x: 37, y: 91 };
      const v = sourceToVisual(p, W, H, rot);
      const back = visualToSource(v, W, H, rot);
      close(back.x, p.x); close(back.y, p.y);
    }
  }),
  test("visual size swaps for quarter turns", () => {
    assert.deepEqual(visualSize(W, H, 90), { w: H, h: W });
    assert.deepEqual(visualSize(W, H, 180), { w: W, h: H });
  }),
  test("normaliseRot wraps values", () => {
    assert.equal(normaliseRot(450), 90);
    assert.equal(normaliseRot(-90), 270);
    assert.equal(normaliseRot(0), 0);
  }),
  test("rotateRectCw gives the hand-worked result for a 300-wide visual frame", () => {
    // Rectangle at x 10..60, y 20..50 in a 300-wide frame, rotated 90° clockwise.
    // New x = 300 − (20 + 30) = 250, new y = 10, new width = 30, new height = 50.
    assert.deepEqual(rotateRectCw({ x: 10, y: 20, w: 50, h: 30 }, 300), { x: 250, y: 10, w: 30, h: 50 });
  }),
  test("mapping agrees with pdf.js convertToViewportPoint for all four rotations", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([W, H]);
    const bytes = await doc.save();
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
    const page = await pdf.getPage(1);
    for (const rot of [0, 90, 180, 270] as Rot[]) {
      const vp = page.getViewport({ scale: 1, rotation: rot });
      const size = visualSize(W, H, rot);
      close(vp.width, size.w); close(vp.height, size.h);
      for (const [X, Y] of [[0, 0], [30, 50], [W, H], [123, 77]] as [number, number][]) {
        const [px, py] = vp.convertToViewportPoint(X, Y);
        const mine = sourceToVisual({ x: X, y: H - Y }, W, H, rot);
        close(mine.x, px); close(mine.y, py);
      }
    }
    await pdf.destroy();
  }),
  test("visualRectToPdf gives hand-worked PDF rectangles for a 90°-rotated 300 × 400 page", () => {
    // Visual frame is 400 wide × 300 tall. The top-left visual corner is the source's bottom-left corner.
    // Visual (0..10, 0..10) -> source (0..10, 390..400) -> PDF user space y from 0 to 10.
    assert.deepEqual(visualRectToPdf({ x: 0, y: 0, w: 10, h: 10 }, W, H, 90), { x: 0, y: 0, w: 10, h: 10 });
    // Visual top-right corner (390..400, 0..10) -> source (0..10, 0..10) -> PDF y from 390 to 400.
    assert.deepEqual(visualRectToPdf({ x: 390, y: 0, w: 10, h: 10 }, W, H, 90), { x: 0, y: 390, w: 10, h: 10 });
  }),
];

let failures = 0;
for (const t of tests) {
  try { await t.fn(); passed++; console.log(`ok - ${t.name}`); }
  catch (e) { failures++; console.log(`not ok - ${t.name}\n   ${(e as Error).message}`); }
}
console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
