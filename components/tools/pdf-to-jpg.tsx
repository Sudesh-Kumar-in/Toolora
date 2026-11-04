"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { loadPdfJs, isPasswordError } from "@/lib/pdfjs-browser";
import { parsePageRanges } from "@/lib/page-ranges";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES_PER_RUN = 60;

export default function PdfToJpg() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [range, setRange] = useState("");
  const [dpi, setDpi] = useState(150);
  const [quality, setQuality] = useState(90);
  const [busy, setBusy] = useState<{ message: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; blob: Blob; page: number }[]>([]);

  async function onFile(list: File[]) {
    setError(null);
    setResults([]);
    setPageCount(null);
    try {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await list[0].arrayBuffer()), isEvalSupported: false } as never).promise;
      setPageCount(doc.numPages);
      await doc.destroy?.();
      setFile(list[0]);
    } catch (err) {
      setFile(null);
      setError(isPasswordError(err)
        ? "This PDF is password protected. Unlock it with the PDF Lock & Unlock tool first."
        : "This PDF could not be opened. It may be damaged.");
    }
  }

  async function convert() {
    setError(null);
    setResults([]);
    if (!file || pageCount === null) return setError("Choose a PDF first.");

    let pages: number[] = Array.from({ length: pageCount }, (_, i) => i + 1);
    if (range.trim()) {
      const parsed = parsePageRanges(range, pageCount);
      if ("error" in parsed) return setError(parsed.error);
      pages = parsed.ranges.flatMap((r) => Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i));
    }
    if (pages.length > MAX_PAGES_PER_RUN) return setError(`Convert up to ${MAX_PAGES_PER_RUN} pages at a time. Use the page range to split the job.`);

    setBusy({ message: "Loading PDF", progress: 0 });
    try {
      const pdfjs = await loadPdfJs();
      const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false } as never).promise;
      const out: { name: string; blob: Blob; page: number }[] = [];
      const base = file.name.replace(/\.[^.]+$/, "");
      for (let i = 0; i < pages.length; i++) {
        const pageNo = pages[i];
        setBusy({ message: `Rendering page ${pageNo}`, progress: i / pages.length });
        const page = await doc.getPage(pageNo);
        const viewport = page.getViewport({ scale: dpi / 72 });
        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Your browser could not start drawing.");
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvasContext: ctx, viewport, canvas } as never).promise;
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This browser could not save a page."))), "image/jpeg", quality / 100),
        );
        out.push({ name: outputName(`${base}`, `-page-${pageNo}`, "jpg"), blob, page: pageNo });
        page.cleanup();
      }
      await doc.destroy?.();
      setResults(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <FileDropzone id="pdfjpg-input" label="Drop a PDF here or click to choose" hint="One PDF at a time." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy !== null} />
        {file && pageCount !== null && <p className="text-sm text-ink-soft"><span className="font-medium text-ink">{file.name}</span> has {pageCount} {pageCount === 1 ? "page" : "pages"}.</p>}
      </div>

      <div className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-5">
        <div>
          <label htmlFor="pdfjpg-range" className="text-sm font-medium text-ink">Pages (blank = all)</label>
          <input id="pdfjpg-range" value={range} onChange={(e) => setRange(e.target.value)} placeholder="e.g. 1-3, 7" disabled={!file} className="field mt-2 font-mono" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pdfjpg-dpi" className="text-sm font-medium text-ink">Resolution</label>
            <select id="pdfjpg-dpi" value={dpi} onChange={(e) => setDpi(Number(e.target.value))} className="field mt-2">
              <option value={72}>72 dpi (screen, smallest)</option>
              <option value={150}>150 dpi (recommended)</option>
              <option value={200}>200 dpi</option>
              <option value={300}>300 dpi (print, largest)</option>
            </select>
          </div>
          <div>
            <label htmlFor="pdfjpg-quality" className="text-sm font-medium text-ink">JPG quality {quality}</label>
            <input id="pdfjpg-quality" type="range" min={50} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} className="mt-4 w-full accent-cobalt" />
          </div>
        </div>
        <button type="button" className="btn-primary w-full" disabled={!file || busy !== null} onClick={convert}>Convert to JPG</button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy.message} progress={busy.progress} />}
        {error && <ErrorStatus message={error} />}
        {results.length > 0 && (
          <section aria-label="Results" className="mt-2 space-y-3">
            <SuccessStatus message={`Converted ${results.length} ${results.length === 1 ? "page" : "pages"}. Download each image below.`} />
            {results.map((r) => <ResultRow key={r.page} filename={r.name} blob={r.blob} />)}
          </section>
        )}
      </div>
    </div>
  );
}
