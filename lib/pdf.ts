"use client";

import type { PageRange } from "@/lib/page-ranges";
import { decodeImage, renderToBlob } from "@/lib/image";

/*
 * pdf-lib is loaded on demand so it only downloads when a PDF tool is opened.
 * Everything here runs in the browser; files are never uploaded.
 */

type PdfLib = typeof import("pdf-lib");

async function loadPdfLib(): Promise<PdfLib> {
  return import("pdf-lib");
}

async function readBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}

async function loadDocument(file: File, lib: PdfLib) {
  try {
    return await lib.PDFDocument.load(await readBytes(file));
  } catch {
    throw new Error(
      `"${file.name}" could not be opened. It may be password protected or damaged.`,
    );
  }
}

export async function getPageCount(file: File): Promise<number> {
  const lib = await loadPdfLib();
  const doc = await loadDocument(file, lib);
  return doc.getPageCount();
}

/** Each image becomes one page sized to the image, so nothing is stretched or cropped. */
export async function imagesToPdf(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const lib = await loadPdfLib();
  const doc = await lib.PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const bytes = await readBytes(file);

    let image;
    if (file.type === "image/png") {
      image = await doc.embedPng(bytes);
    } else {
      image = await embedJpegSafely(doc, bytes, file);
    }

    const page = doc.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    onProgress?.(i + 1, files.length);
  }

  return doc.save();
}

/**
 * Some browsers and JPEG variants (e.g. progressive) are not embedded directly by
 * pdf-lib. In that case, or for any non-JPEG source, re-encode through a canvas.
 */
async function embedJpegSafely(
  doc: import("pdf-lib").PDFDocument,
  bytes: Uint8Array,
  file: File,
) {
  if (file.type === "image/jpeg") {
    try {
      return await doc.embedJpg(bytes);
    } catch {
      // fall through to re-encode
    }
  }
  const bitmap = await decodeImage(file, file.name);
  const jpeg = await renderToBlob(bitmap, {
    width: bitmap.width,
    height: bitmap.height,
    type: "image/jpeg",
    quality: 0.92,
  });
  bitmap.close();
  return doc.embedJpg(new Uint8Array(await jpeg.arrayBuffer()));
}

export async function mergePdfs(
  files: File[],
  onProgress?: (done: number, total: number) => void,
): Promise<Uint8Array> {
  const lib = await loadPdfLib();
  const merged = await lib.PDFDocument.create();

  for (let i = 0; i < files.length; i++) {
    const source = await loadDocument(files[i], lib);
    const pages = await merged.copyPages(source, source.getPageIndices());
    pages.forEach((page) => merged.addPage(page));
    onProgress?.(i + 1, files.length);
  }

  return merged.save();
}

export interface SplitPart {
  label: string;
  bytes: Uint8Array;
}

export async function splitPdf(file: File, ranges: PageRange[]): Promise<SplitPart[]> {
  const lib = await loadPdfLib();
  const source = await loadDocument(file, lib);
  const parts: SplitPart[] = [];

  for (const range of ranges) {
    const out = await lib.PDFDocument.create();
    const indices = Array.from(
      { length: range.end - range.start + 1 },
      (_, k) => range.start - 1 + k,
    );
    const pages = await out.copyPages(source, indices);
    pages.forEach((page) => out.addPage(page));

    const label =
      range.start === range.end
        ? `page-${range.start}`
        : `pages-${range.start}-${range.end}`;
    parts.push({ label, bytes: await out.save() });
  }

  return parts;
}

/**
 * Optimises the PDF file structure (object streams, metadata tidy-up).
 * It does NOT re-compress embedded images, so image-heavy files may shrink very little.
 */
export async function optimisePdf(file: File): Promise<Uint8Array> {
  const lib = await loadPdfLib();
  const doc = await loadDocument(file, lib);
  return doc.save({ useObjectStreams: true });
}
