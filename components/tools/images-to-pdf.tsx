"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { READABLE_IMAGE_TYPES } from "@/lib/image";
import { imagesToPdf } from "@/lib/pdf";
import { outputName } from "@/lib/files";

interface Props {
  inputTypes?: string[];
}

const MAX_FILES = 30;
const MAX_BYTES = 25 * 1024 * 1024;

export default function ImagesToPdf({ inputTypes = READABLE_IMAGE_TYPES }: Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState<{ message: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob } | null>(null);

  function move(index: number, delta: -1 | 1) {
    setFiles((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setResult(null);
  }

  function remove(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setResult(null);
  }

  async function build() {
    setError(null);
    setResult(null);
    if (files.length === 0) return setError("Add at least one image first.");
    setBusy({ message: "Building your PDF", progress: 0 });
    try {
      const bytes = await imagesToPdf(files, (done, total) =>
        setBusy({ message: `Adding image ${done} of ${total}`, progress: done / total }),
      );
      const name = files.length === 1 ? outputName(files[0].name, "", "pdf") : "images.pdf";
      setResult({ name, blob: new Blob([bytes as BlobPart], { type: "application/pdf" }) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the PDF.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <FileDropzone
          id="img-pdf-input"
          label="Drop images here or click to choose"
          hint="Each image becomes one page, in the order shown."
          accept={inputTypes}
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
          <ol className="space-y-2" aria-label="Page order">
            {files.map((f, i) => (
              <li
                key={`${f.name}-${i}`}
                className="flex items-center gap-3 rounded-xl bg-paper-raised px-4 py-2.5"
              >
                <span className="w-6 shrink-0 font-mono text-sm text-ink-mute">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{f.name}</span>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0 || busy !== null}
                    aria-label={`Move ${f.name} up`}
                    className="rounded-lg px-2.5 py-1 text-sm hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === files.length - 1 || busy !== null}
                    aria-label={`Move ${f.name} down`}
                    className="rounded-lg px-2.5 py-1 text-sm hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    disabled={busy !== null}
                    aria-label={`Remove ${f.name}`}
                    className="rounded-lg px-2.5 py-1 text-sm text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-4">
        <p className="text-sm leading-relaxed text-ink-soft">
          Pages are sized to match each image, so nothing is stretched or cropped.
          Non-JPG and non-PNG images are converted to high-quality JPG first.
        </p>
        <button type="button" onClick={build} disabled={busy !== null || files.length === 0} className="btn-primary w-full">
          Create PDF
        </button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy.message} progress={busy.progress} />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your PDF is ready." />
            <ResultRow filename={result.name} blob={result.blob} />
          </section>
        )}
      </div>
    </div>
  );
}
