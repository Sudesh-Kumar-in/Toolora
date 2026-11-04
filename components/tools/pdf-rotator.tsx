"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { getPageCount, rotatePdf } from "@/lib/pdf";
import { parsePageRanges } from "@/lib/page-ranges";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;

export default function PdfRotator() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [turns, setTurns] = useState<1 | 2 | 3>(1);
  const [scope, setScope] = useState<"all" | "some">("all");
  const [pageText, setPageText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob } | null>(null);

  async function onFile(list: File[]) {
    setError(null);
    setResult(null);
    setPageCount(null);
    try {
      const count = await getPageCount(list[0]);
      setFile(list[0]);
      setPageCount(count);
    } catch (err) {
      setFile(null);
      setError(err instanceof Error ? err.message : "Could not read this PDF.");
    }
  }

  async function rotate() {
    setError(null);
    setResult(null);
    if (!file || pageCount === null) return setError("Choose a PDF first.");

    let pages: number[] | null = null;
    if (scope === "some") {
      const parsed = parsePageRanges(pageText, pageCount);
      if ("error" in parsed) return setError(parsed.error);
      pages = parsed.ranges.flatMap((r) => Array.from({ length: r.end - r.start + 1 }, (_, i) => r.start + i));
    }

    setBusy(true);
    try {
      const bytes = await rotatePdf(file, turns, pages);
      setResult({
        name: outputName(file.name, "-rotated", "pdf"),
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation failed.");
    } finally {
      setBusy(false);
    }
  }

  const turnOptions: { value: 1 | 2 | 3; label: string }[] = [
    { value: 1, label: "90° clockwise" },
    { value: 2, label: "180°" },
    { value: 3, label: "90° counter-clockwise" },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <FileDropzone id="rotate-input" label="Drop a PDF here or click to choose" hint="One PDF at a time." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
        {file && pageCount !== null && <p className="text-sm text-ink-soft"><span className="font-medium text-ink">{file.name}</span> has {pageCount} {pageCount === 1 ? "page" : "pages"}.</p>}
      </div>

      <div className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-5">
        <fieldset>
          <legend className="text-sm font-medium text-ink">Rotation</legend>
          <div className="mt-2 grid gap-2">
            {turnOptions.map((o) => (
              <label key={o.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 px-4 py-3 text-sm text-ink has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-wash">
                <input type="radio" name="turns" checked={turns === o.value} onChange={() => setTurns(o.value)} className="accent-cobalt" />
                {o.label}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-sm font-medium text-ink">Pages</legend>
          <div className="mt-2 flex gap-2">
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink/10 px-3 py-2.5 text-sm has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-wash">
              <input type="radio" name="scope" checked={scope === "all"} onChange={() => setScope("all")} className="accent-cobalt" /> All pages
            </label>
            <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-ink/10 px-3 py-2.5 text-sm has-[:checked]:border-cobalt has-[:checked]:bg-cobalt-wash">
              <input type="radio" name="scope" checked={scope === "some"} onChange={() => setScope("some")} className="accent-cobalt" /> Choose pages
            </label>
          </div>
          {scope === "some" && (
            <input aria-label="Pages to rotate" value={pageText} onChange={(e) => setPageText(e.target.value)} placeholder="e.g. 1-3, 6" className="field mt-3 font-mono" />
          )}
        </fieldset>

        <button type="button" onClick={rotate} disabled={busy || !file || pageCount === null} className="btn-primary w-full">Rotate PDF</button>
        <button type="button" className="btn-secondary w-full" onClick={() => { setFile(null); setPageCount(null); setResult(null); setError(null); setPageText(""); setScope("all"); setTurns(1); }}>Reset</button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Rotating pages" />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your rotated PDF is ready." />
            <ResultRow filename={result.name} blob={result.blob} />
          </section>
        )}
      </div>
    </div>
  );
}
