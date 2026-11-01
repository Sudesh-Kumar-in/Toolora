"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { optimisePdf } from "@/lib/pdf";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;

export default function PdfCompressor() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);

  async function onFile(list: File[]) {
    const file = list[0];
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const bytes = await optimisePdf(file);
      setResult({
        name: outputName(file.name, "-optimised", "pdf"),
        blob: new Blob([bytes as BlobPart], { type: "application/pdf" }),
        originalSize: file.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not optimise this PDF.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <FileDropzone
        id="pdf-compress-input"
        label="Drop a PDF here or click to choose"
        hint="Text-based PDFs shrink the most."
        accept={["application/pdf"]}
        maxBytes={MAX_BYTES}
        maxCount={1}
        onFiles={onFile}
        disabled={busy}
      />

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-4 text-sm leading-relaxed text-ink-soft">
        <p>
          This tool tidies the PDF&apos;s internal structure and removes
          redundant data. The file stays readable and selectable.
        </p>
        <p className="text-ink-mute">
          It does not re-compress embedded photos. If your PDF is mostly scanned
          images, expect a small reduction. Image-heavy files need a dedicated
          image-compression step, which is planned for a later release.
        </p>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Optimising PDF" />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus
              message={
                result.blob.size < result.originalSize
                  ? "Your optimised PDF is ready."
                  : "This PDF was already well optimised, so the file did not get smaller."
              }
            />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
