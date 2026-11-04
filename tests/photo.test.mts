// Run with: node --experimental-strip-types tests/photo.test.mts
import assert from "node:assert/strict";
import { clampRect, aspectCropRect, mmToPixels, sheetLayout, validatePositiveInt, PASSPORT_PRESETS } from "../lib/photo.ts";
import { applyAdjustments, autoLevels, sharpen } from "../lib/imageops.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`ok - ${name}`); };

test("clampRect keeps the rectangle inside the image", () => {
  assert.deepEqual(clampRect({ x: -5, y: 90, width: 50, height: 50 }, 100, 100), { x: 0, y: 50, width: 50, height: 50 });
  assert.deepEqual(clampRect({ x: 0, y: 0, width: 999, height: 0 }, 200, 100), { x: 0, y: 0, width: 200, height: 1 });
});

test("aspectCropRect fits a wide image to height", () => {
  assert.deepEqual(aspectCropRect(400, 200, 1, 1, 0, 0), { x: 100, y: 0, width: 200, height: 200 });
});

test("aspectCropRect fits a tall image to width", () => {
  assert.deepEqual(aspectCropRect(200, 400, 1, 1, 0, 0), { x: 0, y: 100, width: 200, height: 200 });
});

test("aspectCropRect zoom shrinks the crop around the centre", () => {
  const r = aspectCropRect(400, 400, 1, 2, 0, 0);
  assert.deepEqual(r, { x: 100, y: 100, width: 200, height: 200 });
});

test("aspectCropRect offsets are limited to the image", () => {
  const left = aspectCropRect(400, 200, 1, 1, -1, 0);
  const right = aspectCropRect(400, 200, 1, 1, 1, 0);
  assert.equal(left.x, 0);
  assert.equal(right.x + right.width, 400);
});

test("aspect ratio of result matches the requested ratio", () => {
  const r = aspectCropRect(1200, 900, 35 / 45, 1.5, 0.3, -0.2);
  assert.ok(Math.abs(r.width / r.height - 35 / 45) < 0.02);
});

test("passport pixel sizes at 300 dpi", () => {
  assert.equal(mmToPixels(51, 300), 602);
  assert.equal(mmToPixels(35, 300), 413);
  assert.equal(mmToPixels(45, 300), 531);
  assert.equal(PASSPORT_PRESETS.length, 3);
});

test("sheet layout for a 4×6 inch print (101.6 × 152.4 mm)", () => {
  const l = sheetLayout(101.6, 152.4, 35, 45);
  assert.equal(l.columns, 2);
  assert.equal(l.rows, 3);
  assert.equal(l.count, 6);
});

test("sheet layout returns zero when the photo does not fit", () => {
  assert.equal(sheetLayout(50, 50, 60, 60).count, 0);
});

test("validatePositiveInt", () => {
  assert.equal(validatePositiveInt("12", 1, 100, "Width"), null);
  assert.ok(validatePositiveInt("", 1, 100, "Width"));
  assert.ok(validatePositiveInt("1.5", 1, 100, "Width"));
  assert.ok(validatePositiveInt("101", 1, 100, "Width"));
});

const px = (...v: number[]) => new Uint8ClampedArray(v);

test("brightness adds and clamps", () => {
  const d = px(100, 100, 100, 255);
  applyAdjustments(d, { brightness: 50, contrast: 0, saturation: 0 });
  assert.deepEqual([...d], [228, 228, 228, 255]);
});

test("zero adjustments leave pixels unchanged", () => {
  const d = px(10, 120, 200, 255, 0, 0, 0, 0);
  applyAdjustments(d, { brightness: 0, contrast: 0, saturation: 0 });
  assert.deepEqual([...d], [10, 120, 200, 255, 0, 0, 0, 0]);
});

test("saturation −100 produces greyscale", () => {
  const d = px(200, 50, 50, 255);
  applyAdjustments(d, { brightness: 0, contrast: 0, saturation: -100 });
  assert.equal(d[0], d[1]);
  assert.equal(d[1], d[2]);
});

test("contrast increases distance from mid-grey", () => {
  const d = px(160, 160, 160, 255);
  applyAdjustments(d, { brightness: 0, contrast: 50, saturation: 0 });
  assert.ok(d[0] > 160);
});

test("auto levels stretch a narrow range to full range", () => {
  const d = new Uint8ClampedArray(4 * 200);
  for (let i = 0; i < 200; i++) { const v = 100 + (i % 50); d.set([v, v, v, 255], i * 4); }
  autoLevels(d);
  let min = 255, max = 0;
  for (let i = 0; i < d.length; i += 4) { min = Math.min(min, d[i]); max = Math.max(max, d[i]); }
  assert.equal(min, 0);
  assert.equal(max, 255);
});

test("sharpen leaves flat areas unchanged and boosts edges", () => {
  const flat = new Uint8ClampedArray(4 * 9).fill(120);
  sharpen(flat, 3, 3, 1);
  assert.ok(flat.every((v, i) => i % 4 === 3 || v === 120));

  const edge = new Uint8ClampedArray(4 * 9);
  for (let i = 0; i < 9; i++) edge.set([i % 3 === 0 ? 50 : 200, 0, 0, 255], i * 4);
  const before = edge[4 * 4];
  sharpen(edge, 3, 3, 1);
  assert.notEqual(edge[4 * 4], before);
});

console.log(`\n${passed} tests passed`);
