"use client";

import { loadPdfJs } from "@/lib/pdfjs-browser";
import { normaliseRotation, textItemToViewRect, type Box, type Rot } from "@/lib/pdf-editor-geometry";

/** A PDF opened with pdf.js for display only. Export always uses pdf-lib on the original bytes. */
export interface OpenedPage {
  view: Box;
  base: Rot;
}

export interface OpenedDoc {
  // pdf.js document proxy; typed loosely because pdf.js types are loaded at runtime.
  pdf: any;
  pages: OpenedPage[];
}

export interface TextRect {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export async function openPdfDocument(bytes: Uint8Array): Promise<OpenedDoc> {
  const pdfjs: any = await loadPdfJs();
  // pdf.js takes ownership of the buffer it is given, so pass a copy and keep `bytes` intact.
  const pdf = await pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false }).promise;
  const pages: OpenedPage[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const [x0, y0, x1, y1] = page.view as number[];
    pages.push({ view: { x0, y0, x1, y1 }, base: normaliseRotation(page.rotate ?? 0) });
  }
  return { pdf, pages };
}

/** Renders one page to a canvas at `scale` (CSS pixels per PDF point), with total rotation `rot`. */
export async function renderPage(
  pdf: any,
  pageNumber: number,
  rot: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale, rotation: rot });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not draw the page.");
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
  return canvas;
}

/** Selectable text on a page, converted to VIEW rectangles. */
export async function pageTextRects(pdf: any, pageNumber: number, view: Box): Promise<TextRect[]> {
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  const out: TextRect[] = [];
  for (const it of content.items as { str?: string; transform?: number[]; width?: number; height?: number }[]) {
    if (typeof it.str !== "string" || !it.str.trim() || !it.transform) continue;
    const height = it.height || Math.abs(it.transform[3]) || 10;
    const width = it.width ?? it.str.length * height * 0.5;
    const r = textItemToViewRect(it.transform[4], it.transform[5], width, height, view);
    out.push({ str: it.str, ...r });
  }
  return out;
}
