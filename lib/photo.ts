/** Pure geometry for the crop, passport and print-sheet tools. No imports. */

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Keeps a rectangle inside an image and at least 1 pixel in each direction. */
export function clampRect(rect: CropRect, imgW: number, imgH: number): CropRect {
  const width = Math.max(1, Math.min(Math.round(rect.width), imgW));
  const height = Math.max(1, Math.min(Math.round(rect.height), imgH));
  const x = Math.min(Math.max(0, Math.round(rect.x)), imgW - width);
  const y = Math.min(Math.max(0, Math.round(rect.y)), imgH - height);
  return { x, y, width, height };
}

/**
 * Largest rectangle with the given aspect ratio (width / height) that fits in the image,
 * centred. `zoom` ≥ 1 shrinks it (2 = half the size). `offsetX` / `offsetY` in −1..1 shift
 * it toward an edge, limited so it stays inside the image.
 */
export function aspectCropRect(
  imgW: number,
  imgH: number,
  aspect: number,
  zoom = 1,
  offsetX = 0,
  offsetY = 0,
): CropRect {
  let width: number;
  let height: number;
  if (imgW / imgH > aspect) {
    height = imgH;
    width = height * aspect;
  } else {
    width = imgW;
    height = width / aspect;
  }
  const z = Math.max(1, zoom);
  width /= z;
  height /= z;

  const maxDx = (imgW - width) / 2;
  const maxDy = (imgH - height) / 2;
  const clampUnit = (v: number) => Math.min(1, Math.max(-1, v));
  const x = (imgW - width) / 2 + clampUnit(offsetX) * maxDx;
  const y = (imgH - height) / 2 + clampUnit(offsetY) * maxDy;
  return clampRect({ x, y, width, height }, imgW, imgH);
}

export interface PassportPreset {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
}

export const PASSPORT_PRESETS: PassportPreset[] = [
  { id: "2x2in", label: "2 × 2 in (51 × 51 mm)", widthMm: 51, heightMm: 51 },
  { id: "35x45", label: "35 × 45 mm", widthMm: 35, heightMm: 45 },
  { id: "35x35", label: "35 × 35 mm", widthMm: 35, heightMm: 35 },
];

export function mmToPixels(mm: number, dpi: number): number {
  return Math.round((mm / 25.4) * dpi);
}

/** How many copies of a photo fit on a sheet, leaving a margin and gap between photos. */
export function sheetLayout(
  sheetWmm: number,
  sheetHmm: number,
  photoWmm: number,
  photoHmm: number,
  marginMm = 5,
  gapMm = 3,
): { columns: number; rows: number; count: number } {
  const usableW = sheetWmm - 2 * marginMm;
  const usableH = sheetHmm - 2 * marginMm;
  const columns = Math.max(0, Math.floor((usableW + gapMm) / (photoWmm + gapMm)));
  const rows = Math.max(0, Math.floor((usableH + gapMm) / (photoHmm + gapMm)));
  return { columns, rows, count: columns * rows };
}

/** Validates a numeric text field. Returns an error message or null. */
export function validatePositiveInt(text: string, min: number, max: number, label: string): string | null {
  if (text.trim() === "") return `Enter ${label}.`;
  const n = Number(text);
  if (!Number.isInteger(n) || n < min || n > max) return `${label} must be a whole number from ${min} to ${max}.`;
  return null;
}
