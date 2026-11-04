/**
 * Coordinate mapping for the PDF Editor. No imports, so it runs in Node tests.
 *
 * Three spaces:
 *  - VIEW: the unrotated page, origin at top-left, y pointing down, in PDF points.
 *    Annotations are stored in this space, so they stay attached to the page content
 *    when the page is rotated.
 *  - DISPLAY: what the user sees after the page is rotated clockwise by `rot` degrees.
 *  - PDF: the page's media box in PDF user space (origin bottom-left, y up).
 */

export type Rot = 0 | 90 | 180 | 270;

export interface Box { x0: number; y0: number; x1: number; y1: number }
export interface Size { w: number; h: number }
export interface Point { x: number; y: number }

export function normaliseRotation(deg: number): Rot {
  const d = ((Math.round(deg) % 360) + 360) % 360;
  const q = Math.round(d / 90) % 4;
  return (q * 90) as Rot;
}

export function viewSize(box: Box): Size {
  return { w: box.x1 - box.x0, h: box.y1 - box.y0 };
}

export function displaySize(view: Size, rot: Rot): Size {
  return rot === 90 || rot === 270 ? { w: view.h, h: view.w } : { w: view.w, h: view.h };
}

/** VIEW point → DISPLAY point, for a page rotated clockwise by `rot`. */
export function viewToDisplay(p: Point, view: Size, rot: Rot): Point {
  switch (rot) {
    case 0: return { x: p.x, y: p.y };
    case 90: return { x: view.h - p.y, y: p.x };
    case 180: return { x: view.w - p.x, y: view.h - p.y };
    case 270: return { x: p.y, y: view.w - p.x };
  }
}

/** DISPLAY point → VIEW point. Exact inverse of viewToDisplay. */
export function displayToView(p: Point, view: Size, rot: Rot): Point {
  switch (rot) {
    case 0: return { x: p.x, y: p.y };
    case 90: return { x: p.y, y: view.h - p.x };
    case 180: return { x: view.w - p.x, y: view.h - p.y };
    case 270: return { x: view.w - p.y, y: p.x };
  }
}

/** VIEW point → PDF user-space point (y up). */
export function viewToPdf(p: Point, box: Box): Point {
  return { x: box.x0 + p.x, y: box.y1 - p.y };
}

/**
 * Converts a text item from pdf.js (baseline x/y in user space, font height) into a VIEW
 * rectangle with top-left origin.
 */
export function textItemToViewRect(
  tx: number,
  ty: number,
  width: number,
  height: number,
  box: Box,
): { x: number; y: number; w: number; h: number } {
  return {
    x: tx - box.x0,
    y: box.y1 - (ty + height),
    w: width,
    h: height,
  };
}

/** Rotates an annotation-space rectangle size for display: returns width/height as shown. */
export function displayRectOfView(
  rect: { x: number; y: number; w: number; h: number },
  view: Size,
  rot: Rot,
): { x: number; y: number; w: number; h: number } {
  const corners = [
    viewToDisplay({ x: rect.x, y: rect.y }, view, rot),
    viewToDisplay({ x: rect.x + rect.w, y: rect.y }, view, rot),
    viewToDisplay({ x: rect.x, y: rect.y + rect.h }, view, rot),
    viewToDisplay({ x: rect.x + rect.w, y: rect.y + rect.h }, view, rot),
  ];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
}
