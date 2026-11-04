"use client";

import type { PdfJsLib } from "@/lib/pdf-text";

/**
 * Loads pdf.js in the browser on demand. The worker is a separate file served from the
 * same site, so no PDF data or script is fetched from a third party.
 */
export async function loadPdfJs(): Promise<PdfJsLib & { GlobalWorkerOptions: { workerSrc: string } }> {
  const pdfjs = (await import("pdfjs-dist/build/pdf.mjs")) as unknown as PdfJsLib & {
    GlobalWorkerOptions: { workerSrc: string };
  };
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  }
  return pdfjs;
}

/** True when pdf.js reports that the document is password protected. */
export function isPasswordError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { name?: string }).name === "PasswordException";
}
