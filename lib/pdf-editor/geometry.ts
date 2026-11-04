/**
 * Coordinate mapping between the editor's "visual" frame and a PDF page's source frame.
 *
 * Source frame: unrotated media box of size W × H, origin top-left (y grows downward).
 * Visual frame: the page as a viewer shows it after /Rotate, origin top-left.
 * `rot` is the effective clockwise rotation (0, 90, 180 or 270) as viewers apply it.
 * No imports, so it can be unit tested against pdf.js.
 */

export type Rot = 0 | 90 | 180 | 270;
export interface Pt { x: number; y: number }
export interface Rect { x: number; y: number; w: number; h: number }

export function normaliseRot(deg: number): Rot {
  const r = ((Math.round(deg / 90) * 90) % 360 + 360) % 360;
  return r as Rot;
}

/** Visual width and height for a page of media size W × H shown at rot. */
export function visualSize(W: number, H: number, rot: Rot): { w: number; h: number } {
  return rot === 90 || rot === 270 ? { w: H, h: W } : { w: W, h: H };
}

export function sourceToVisual(p: Pt, W: number, H: number, rot: Rot): Pt {
  switch (rot) {
    case 0: return { x: p.x, y: p.y };
    case 90: return { x: H - p.y, y: p.x };
    case 180: return { x: W - p.x, y: H - p.y };
    case 270: return { x: p.y, y: W - p.x };
  }
}

export function visualToSource(p: Pt, W: number, H: number, rot: Rot): Pt {
  switch (rot) {
    case 0: return { x: p.x, y: p.y };
    case 90: return { x: p.y, y: H - p.x };
    case 180: return { x: W - p.x, y: H - p.y };
    case 270: return { x: W - p.y, y: p.x };
  }
}

/** Converts a source-frame (top-left origin) point to PDF user space (bottom-left origin). */
export function sourceToPdf(p: Pt, H: number): Pt {
  return { x: p.x, y: H - p.y };
}

/** Axis-aligned visual rectangle mapped to PDF user space. Rotation by quarter turns keeps it axis-aligned. */
export function visualRectToPdf(r: Rect, W: number, H: number, rot: Rot): Rect {
  const a = sourceToPdf(visualToSource({ x: r.x, y: r.y }, W, H, rot), H);
  const b = sourceToPdf(visualToSource({ x: r.x + r.w, y: r.y + r.h }, W, H, rot), H);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/**
 * Rotates the visual frame of size (vw × vh) by 90° clockwise, the way a "Rotate right"
 * action changes the page. Used to move annotations along with the page.
 */
export function rotateRectCw(r: Rect, vw: number): Rect {
  return { x: vw - (r.y + r.h), y: r.x, w: r.h, h: r.w };
}

export function rotatePtCw(p: Pt, vw: number): Pt {
  return { x: vw - p.y, y: p.x };
}
