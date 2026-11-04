"use client";

import { useState } from "react";
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
import { outputName, percentSaved } from "@/lib/files";

type FormatChoice = "original" | RasterFormat;

interface Result {
  name: string;
  blob: Blob;
  originalSize: number;
}

const MAX_FILES = 10;

function summary(count: number, before: number, after: number): string {
  const noun = count === 1 ? "image" : "images";
  const saved = percentSaved(before, after);
  if (saved > 0) return `Compressed ${count} ${noun}. Total saving: ${saved}%.`;
  if (saved < 0) return `Converted ${count} ${noun}, but the output is ${Math.abs(saved)}% larger. Try a lower quality or a different format.`;
  return `Processed ${count} ${noun}. The size did not change.`;
}
const MAX_BYTES = 25 * 1024 * 1024;

export default function ImageCompressor() {
  const [quality, setQuality] = useState(80);
  const [format, setFormat] = useState<FormatChoice>("original");
  const [maxWidth, setMaxWidth] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState<{ message: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const widthValue = maxWidth.trim() === "" ? undefined : Number(maxWidth);
  const widthInvalid =
    widthValue !== undefined && (!Number.isInteger(widthValue) || widthValue < 1 || widthValue > 10000);

  async function compress() {
    setError(null);
    setResults([]);
    if (widthInvalid) {
      setError("Maximum width must be a whole number between 1 and 10000 pixels.");
      return;
    }
    if (files.length === 0) {
      setError("Add at least one image first.");
      return;
    }

    try {
      const out: Result[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBusy({ message: `Compressing ${file.name}`, progress: i / files.length });

        const bitmap = await decodeImage(file, file.name);
        // Never upscale: cap the width at the source width.
        const scale = widthValue && widthValue < bitmap.width ? widthValue / bitmap.width : 1;
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const type: RasterFormat =
          format === "original"
            ? (file.type === "image/webp" ? "image/webp" : file.type === "image/png" ? "image/png" : "image/jpeg")
            : format;

        const blob = await renderToBlob(bitmap, { width, height, type, quality: quality / 100 });
        bitmap.close();

        out.push({
          name: outputName(file.name, "-compressed", FORMAT_EXTENSION[type]),
          blob,
          originalSize: file.size,
        });
      }
      setResults(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong while compressing.");
    } finally {
      setBusy(null);
    }
  }

  const totalBefore = results.reduce((s, r) => s + r.originalSize, 0);
  const totalAfter = results.reduce((s, r) => s + r.blob.size, 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <FileDropzone
          id="compress-input"
          label="Drop images here or click to choose"
          hint="JPG, PNG or WebP."
          accept={READABLE_IMAGE_TYPES}
          maxBytes={MAX_BYTES}
          maxCount={MAX_FILES}
          onFiles={(list) => {
            setFiles(list);
            setResults([]);
            setError(null);
          }}
          disabled={busy !== null}
        />

        {files.length > 0 && (
          <ul className="space-y-2 text-sm text-ink-soft">
            {files.map((f) => (
              <li key={f.name + f.size} className="truncate rounded-xl bg-paper-raised px-4 py-2.5">
                {f.name}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="quality" className="text-sm font-medium text-ink">
                Quality
              </label>
              <span className="font-mono text-sm">{quality}</span>
            </div>
            <input
              id="quality"
              type="range"
              min={10}
              max={100}
              step={1}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-3 w-full accent-cobalt"
            />
            <p className="mt-2 text-xs text-ink-mute">
              Lower values make smaller files. 75–85 suits most photos. PNG
              output ignores this setting because PNG is lossless.
            </p>
          </div>

          <div>
            <label htmlFor="format" className="text-sm font-medium text-ink">
              Output format
            </label>
            <select
              id="format"
              value={format}
              onChange={(e) => setFormat(e.target.value as FormatChoice)}
              className="field mt-2"
            >
              <option value="original">Keep original format</option>
              <option value="image/jpeg">JPG (smallest for photos)</option>
              <option value="image/webp">WebP (smaller, modern browsers)</option>
              <option value="image/png">PNG (lossless)</option>
            </select>
          </div>

          <div>
            <label htmlFor="max-width" className="text-sm font-medium text-ink">
              Maximum width (optional)
            </label>
            <input
              id="max-width"
              type="number"
              inputMode="numeric"
              min={1}
              max={10000}
              value={maxWidth}
              onChange={(e) => setMaxWidth(e.target.value)}
              placeholder="Keep original size"
              aria-invalid={widthInvalid}
              className="field mt-2"
            />
            <p className="mt-2 text-xs text-ink-mute">Images are never enlarged.</p>
          </div>

          <button
            type="button"
            onClick={compress}
            disabled={busy !== null || files.length === 0}
            className="btn-primary w-full"
          >
            Compress {files.length > 1 ? `${files.length} images` : "image"}
          </button>
        </div>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy.message} progress={busy.progress} />}
        {error && <ErrorStatus message={error} />}
        {results.length > 0 && (
          <section aria-label="Results" className="mt-2 space-y-3">
            <SuccessStatus message={summary(results.length, totalBefore, totalAfter)} />
            {results.map((r) => (
              <ResultRow key={r.name} filename={r.name} blob={r.blob} originalSize={r.originalSize} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
