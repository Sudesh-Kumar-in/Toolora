"use client";

import { useEffect, useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import {
  decodeImage,
  FORMAT_EXTENSION,
  READABLE_IMAGE_TYPES,
  renderToBlob,
  type RasterFormat,
} from "@/lib/image";
import { computeDimensions, outputName } from "@/lib/files";

const MAX_BYTES = 25 * 1024 * 1024;

interface ParsedDimension {
  value?: number;
  invalid: boolean;
}

/** Blank means "keep the source value". Anything else must be a whole number 1–10000. */
function parseDimension(text: string): ParsedDimension {
  if (text.trim() === "") return { value: undefined, invalid: false };
  const n = Number(text);
  if (!Number.isInteger(n) || n < 1 || n > 10000) return { value: undefined, invalid: true };
  return { value: n, invalid: false };
}

function outputFormatFor(file: File): RasterFormat {
  if (file.type === "image/png") return "image/png";
  if (file.type === "image/webp") return "image/webp";
  return "image/jpeg";
}

export default function ImageResizer() {
  const [file, setFile] = useState<File | null>(null);
  const [source, setSource] = useState<{ width: number; height: number } | null>(null);
  const [widthText, setWidthText] = useState("");
  const [heightText, setHeightText] = useState("");
  const [lockAspect, setLockAspect] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);

  // Read the natural size of the chosen image so we can show a live preview.
  useEffect(() => {
    let cancelled = false;
    setSource(null);
    if (!file) return;
    decodeImage(file, file.name)
      .then((bmp) => {
        if (!cancelled) setSource({ width: bmp.width, height: bmp.height });
        bmp.close();
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [file]);

  const w = parseDimension(widthText);
  const h = parseDimension(heightText);
  const invalid = w.invalid || h.invalid;
  const preview =
    source && !invalid
      ? computeDimensions(source, { width: w.value, height: h.value, lockAspect })
      : null;

  async function resize() {
    setError(null);
    setResult(null);
    if (!file) return setError("Choose an image first.");
    if (invalid) return setError("Width and height must be whole numbers between 1 and 10000.");
    if (!source || !preview) return setError("The image is still loading. Try again in a moment.");

    setBusy(true);
    try {
      const bitmap = await decodeImage(file, file.name);
      const type = outputFormatFor(file);
      const blob = await renderToBlob(bitmap, { ...preview, type, quality: 0.92 });
      bitmap.close();
      setResult({
        name: outputName(file.name, `-${preview.width}x${preview.height}`, FORMAT_EXTENSION[type]),
        blob,
        originalSize: file.size,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Resizing failed. Try a different image.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <FileDropzone
          id="resize-input"
          label="Drop an image here or click to choose"
          hint="JPG, PNG or WebP."
          accept={READABLE_IMAGE_TYPES}
          maxBytes={MAX_BYTES}
          maxCount={1}
          onFiles={(list) => {
            setFile(list[0]);
            setResult(null);
            setError(null);
          }}
          disabled={busy}
        />
        {source && file && (
          <p className="text-sm text-ink-soft">
            <span className="font-medium text-ink">{file.name}</span> is {source.width} × {source.height} pixels.
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="rs-width" className="text-sm font-medium text-ink">Width (px)</label>
            <input
              id="rs-width"
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              value={widthText}
              placeholder={source ? String(source.width) : ""}
              onChange={(e) => setWidthText(e.target.value)}
              aria-invalid={w.invalid}
              className="field mt-2"
            />
          </div>
          <div>
            <label htmlFor="rs-height" className="text-sm font-medium text-ink">Height (px)</label>
            <input
              id="rs-height"
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              value={heightText}
              placeholder={source ? String(source.height) : ""}
              onChange={(e) => setHeightText(e.target.value)}
              aria-invalid={h.invalid}
              className="field mt-2"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={lockAspect}
            onChange={(e) => setLockAspect(e.target.checked)}
            className="h-4 w-4 accent-cobalt"
          />
          Keep proportions (lock aspect ratio)
        </label>

        {preview && (
          <p className="rounded-xl bg-cobalt-wash px-4 py-3 text-sm text-ink" aria-live="polite">
            New size: <strong className="font-semibold">{preview.width} × {preview.height} px</strong>
          </p>
        )}

        <button
          type="button"
          onClick={resize}
          disabled={busy || !file || !source}
          className="btn-primary w-full"
        >
          Resize image
        </button>
        <p className="text-xs text-ink-mute">
          Leave a field blank to keep that dimension. Enlarging an image can make it look soft.
        </p>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Resizing image" />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your resized image is ready." />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
