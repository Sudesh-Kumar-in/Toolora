"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { READABLE_IMAGE_TYPES } from "@/lib/image";
import { outputName } from "@/lib/files";

const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Removes the background in the browser using @imgly/background-removal (open-source, runs on
 * WebAssembly and WebGPU/CPU). The first run downloads the model files (several tens of MB),
 * which the browser then caches. Nothing about the photo itself is uploaded.
 */
export default function BackgroundRemover() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ label: string; ratio: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; url: string; originalSize: number } | null>(null);

  function onFile(list: File[]) {
    setError(null);
    setResult(null);
    setFile(list[0]);
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(list[0]); });
  }

  async function run() {
    if (!file) return setError("Choose a photo first.");
    setError(null);
    setResult(null);
    setBusy(true);
    setProgress({ label: "Preparing", ratio: 0 });
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      const blob: Blob = await removeBackground(file, {
        progress: (key: string, current: number, total: number) => {
          setProgress({ label: key.includes("fetch") ? "Downloading model (first run only)" : "Removing background", ratio: total ? current / total : 0 });
        },
      });
      const url = URL.createObjectURL(blob);
      setResult({ name: outputName(file.name, "-no-background", "png"), blob, url, originalSize: file.size });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        /fetch|network|Failed to/i.test(msg)
          ? "The background model could not be downloaded. Check your internet connection and try again."
          : "Background removal failed for this photo. Try a different image, or a smaller one.",
      );
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <FileDropzone id="bg-input" label="Drop a photo here or click to choose" hint="A clear subject works best. Up to 15 MB." accept={READABLE_IMAGE_TYPES} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
        {previewUrl && (
          <figure>
            <figcaption className="mb-2 text-sm font-medium text-ink-soft">Original</figcaption>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="Original photo selected for background removal" className="max-h-[360px] w-auto max-w-full rounded-xl border border-ink/10" />
          </figure>
        )}
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-primary" disabled={!file || busy} onClick={run}>Remove background</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => { setFile(null); setPreviewUrl(null); setResult(null); setError(null); }}>Reset</button>
        </div>
        {busy && progress && <BusyStatus message={progress.label} progress={progress.ratio} />}
        {error && <ErrorStatus message={error} />}
      </div>

      <div className="space-y-4">
        <p className="text-sm font-medium text-ink-soft">Result</p>
        <div
          className="flex min-h-[280px] items-center justify-center rounded-2xl border border-ink/10 p-4"
          style={{ backgroundImage: "linear-gradient(45deg,#ECEAE4 25%,transparent 25%),linear-gradient(-45deg,#ECEAE4 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#ECEAE4 75%),linear-gradient(-45deg,transparent 75%,#ECEAE4 75%)", backgroundSize: "20px 20px", backgroundColor: "#fff" }}
        >
          {result ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={result.url} alt="Photo with background removed" className="max-h-[360px] w-auto max-w-full" />
          ) : (
            <p className="text-sm text-ink-mute">The result appears here with a transparent background.</p>
          )}
        </div>
        {result && (
          <section aria-label="Result" className="space-y-3">
            <SuccessStatus message="Background removed. The PNG keeps transparency." />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
