"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { mergePdfs } from "@/lib/pdf";

const MAX_FILES = 20;
const MAX_BYTES = 50 * 1024 * 1024;

export default function PdfMerger() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<{ message: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob } | null>(null);

  function move(index: number, delta: -1 | 1) {
    setFiles((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  async function merge() {
    setError(null);
    setResult(null);
    if (files.length < 2) return setError("Add at least two PDFs to merge.");
    setBusy({ message: "Merging PDFs", progress: 0 });
    try {
      const bytes = await mergePdfs(files, (done, total) =>
        setBusy({ message: `Reading file ${done} of ${total}`, progress: done / total }),
      );
      setResult({
        name: "merged.pdf",
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merging failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <FileDropzone
          id="merge-input"
          label="Drop PDFs here or click to choose"
          hint="Files are merged in the order listed below."
          accept={["application/pdf"]}
          maxBytes={MAX_BYTES}
          maxCount={MAX_FILES}
          onFiles={(list) => {
            setFiles((prev) => [...prev, ...list].slice(0, MAX_FILES));
            setResult(null);
            setError(null);
          }}
          disabled={busy !== null}
        />

        {files.length > 0 && (
          <ol className="space-y-2" aria-label="Merge order">
            {files.map((f, i) => (
              <li key={`${f.name}-${i}`} className="flex items-center gap-3 rounded-xl bg-paper-raised px-4 py-2.5">
                <span className="w-6 shrink-0 font-mono text-sm text-ink-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
                <div className="flex shrink-0 gap-1">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0 || busy !== null} aria-label={`Move ${f.name} up`} className="rounded-lg px-2.5 py-1 text-sm hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">↑</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === files.length - 1 || busy !== null} aria-label={`Move ${f.name} down`} className="rounded-lg px-2.5 py-1 text-sm hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">↓</button>
                  <button type="button" onClick={() => { setFiles((p) => p.filter((_, k) => k !== i)); setResult(null); }} disabled={busy !== null} aria-label={`Remove ${f.name}`} className="rounded-lg px-2.5 py-1 text-sm text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">✕</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          Pages keep their original size and order within each file. Password-protected PDFs cannot be merged.
        </p>
        <button type="button" onClick={merge} disabled={busy !== null || files.length < 2} className="btn-primary w-full">
          Merge {files.length > 0 ? `${files.length} PDFs` : "PDFs"}
        </button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy.message} progress={busy.progress} />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your merged PDF is ready." />
            <ResultRow filename={result.name} blob={result.blob} />
          </section>
        )}
      </div>
    </div>
  );
}
