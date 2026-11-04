"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { getPageCount, watermarkPdf } from "@/lib/pdf";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;
const DEFAULT_TEXT = "CONFIDENTIAL";

export default function PdfWatermark() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [text, setText] = useState(DEFAULT_TEXT);
  const [opacity, setOpacity] = useState(25);
  const [fontSize, setFontSize] = useState(48);
  const [angle, setAngle] = useState(45);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob } | null>(null);

  async function onFile(list: File[]) {
    setError(null);
    setResult(null);
    try {
      setPageCount(await getPageCount(list[0]));
      setFile(list[0]);
    } catch (err) {
      setFile(null);
      setPageCount(null);
      setError(err instanceof Error ? err.message : "Could not read this PDF.");
    }
  }

  async function apply() {
    setError(null);
    setResult(null);
    if (!file) return setError("Choose a PDF first.");
    // Helvetica (the built-in PDF font) covers Latin letters only.
    const clean = text.trim();
    if (!clean) return setError("Enter the watermark text.");
    if (clean.length > 60) return setError("Keep the watermark under 60 characters.");
    if (!/^[\x20-\x7E]*$/.test(clean)) return setError("Use plain English letters, numbers and punctuation for the watermark.");

    setBusy(true);
    try {
      const bytes = await watermarkPdf(file, { text: clean, opacity: opacity / 100, fontSize, angle });
      setResult({ name: outputName(file.name, "-watermarked", "pdf"), blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the watermark.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <FileDropzone id="wm-input" label="Drop a PDF here or click to choose" hint="One PDF at a time." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
        {file && pageCount !== null && <p className="text-sm text-ink-soft"><span className="font-medium text-ink">{file.name}</span> has {pageCount} {pageCount === 1 ? "page" : "pages"}. The watermark goes on every page.</p>}
      </div>

      <div className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-5">
        <div>
          <label htmlFor="wm-text" className="text-sm font-medium text-ink">Watermark text</label>
          <input id="wm-text" value={text} onChange={(e) => setText(e.target.value)} maxLength={60} className="field mt-2" />
        </div>
        <div>
          <div className="flex justify-between text-sm"><label htmlFor="wm-opacity" className="font-medium text-ink">Opacity</label><span className="font-mono">{opacity}%</span></div>
          <input id="wm-opacity" type="range" min={5} max={80} value={opacity} onChange={(e) => setOpacity(Number(e.target.value))} className="mt-2 w-full accent-cobalt" />
        </div>
        <div>
          <div className="flex justify-between text-sm"><label htmlFor="wm-size" className="font-medium text-ink">Font size</label><span className="font-mono">{fontSize} pt</span></div>
          <input id="wm-size" type="range" min={12} max={120} value={fontSize} onChange={(e) => setFontSize(Number(e.target.value))} className="mt-2 w-full accent-cobalt" />
        </div>
        <div>
          <label htmlFor="wm-angle" className="text-sm font-medium text-ink">Angle</label>
          <select id="wm-angle" value={angle} onChange={(e) => setAngle(Number(e.target.value))} className="field mt-2">
            <option value={0}>Horizontal</option>
            <option value={45}>Diagonal (45°)</option>
            <option value={90}>Vertical</option>
          </select>
        </div>
        <button type="button" onClick={apply} disabled={busy || !file} className="btn-primary w-full">Add watermark</button>
        <button type="button" className="btn-secondary w-full" onClick={() => { setText(DEFAULT_TEXT); setOpacity(25); setFontSize(48); setAngle(45); setResult(null); setError(null); }}>Reset settings</button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Adding watermark" />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your watermarked PDF is ready." />
            <ResultRow filename={result.name} blob={result.blob} />
          </section>
        )}
      </div>
    </div>
  );
}
