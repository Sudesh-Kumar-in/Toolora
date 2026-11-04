"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { getPageCount, splitPdf, type SplitPart } from "@/lib/pdf";
import { parsePageRanges } from "@/lib/page-ranges";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;

export default function PdfSplitter() {
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [rangeText, setRangeText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parts, setParts] = useState<{ name: string; blob: Blob }[]>([]);

  async function onFile(list: File[]) {
    const chosen = list[0];
    setFile(chosen);
    setParts([]);
    setError(null);
    setPageCount(null);
    try {
      setPageCount(await getPageCount(chosen));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read this PDF.");
      setFile(null);
    }
  }

  async function split() {
    setError(null);
    setParts([]);
    if (!file || pageCount === null) return setError("Choose a PDF first.");

    const parsed = parsePageRanges(rangeText, pageCount);
    if ("error" in parsed) return setError(parsed.error);

    setBusy(true);
    try {
      const results = await splitPdf(file, parsed.ranges);
      const base = file.name;
      setParts(
        results.map((part: SplitPart) => ({
          name: outputName(base, `-${part.label}`, "pdf"),
          blob: new Blob([part.bytes as BlobPart], { type: "application/pdf" }),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Splitting failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-4">
        <FileDropzone
          id="split-input"
          label="Drop a PDF here or click to choose"
          hint="One PDF at a time."
          accept={["application/pdf"]}
          maxBytes={MAX_BYTES}
          maxCount={1}
          onFiles={onFile}
          disabled={busy}
        />
        {file && pageCount !== null && (
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">{file.name}</span> has {pageCount} {pageCount === 1 ? "page" : "pages"}.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-4">
        <div>
          <label htmlFor="split-ranges" className="text-sm font-medium text-ink">
            Pages to extract
          </label>
          <input
            id="split-ranges"
            type="text"
            value={rangeText}
            onChange={(e) => setRangeText(e.target.value)}
            placeholder="1-3, 5, 7-9"
            disabled={!file}
            className="field mt-2 font-mono"
            aria-describedby="split-help"
          />
          <p id="split-help" className="mt-2 text-xs leading-relaxed text-ink-mute">
            Each comma-separated range becomes its own PDF. Example: “1-3, 5” creates two files.
          </p>
        </div>
        <button type="button" onClick={split} disabled={busy || !file || pageCount === null} className="btn-primary w-full">
          Split PDF
        </button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Splitting PDF" />}
        {error && <ErrorStatus message={error} />}
        {parts.length > 0 && (
          <section aria-label="Results" className="mt-2 space-y-3">
            <SuccessStatus message={`Created ${parts.length} ${parts.length === 1 ? "file" : "files"}.`} />
            {parts.map(({ name, blob }) => (
              <ResultRow key={name} filename={name} blob={blob} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
