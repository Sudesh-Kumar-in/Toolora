"use client";

import { useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import {
  decodeImage,
  FORMAT_EXTENSION,
  FORMAT_LABEL,
  READABLE_IMAGE_TYPES,
  renderToBlob,
  type RasterFormat,
} from "@/lib/image";
import { outputName } from "@/lib/files";

interface Props {
  /** Restrict accepted input types, e.g. ["image/jpeg"] for a JPG-only tool. */
  inputTypes?: string[];
  /** Lock the output format (used by the fixed-format tools). */
  fixedTarget?: RasterFormat;
  /** Short intro line shown above the tool, for SEO-relevant wording on fixed pages. */
  note?: string;
}

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const ALL_TARGETS: RasterFormat[] = ["image/jpeg", "image/png", "image/webp"];

export default function ImageConverter({ inputTypes = READABLE_IMAGE_TYPES, fixedTarget, note }: Props) {
  const [target, setTarget] = useState<RasterFormat>(fixedTarget ?? "image/png");
  const [quality, setQuality] = useState(90);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<{ name: string; blob: Blob; originalSize: number }[]>([]);
  const [busy, setBusy] = useState<{ message: string; progress: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTarget = fixedTarget ?? target;

  async function convert() {
    setError(null);
    setResults([]);
    if (files.length === 0) return setError("Add at least one image first.");

    try {
      const out: { name: string; blob: Blob; originalSize: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setBusy({ message: `Converting ${file.name}`, progress: i / files.length });
        const bitmap = await decodeImage(file, file.name);
        const blob = await renderToBlob(bitmap, {
          width: bitmap.width,
          height: bitmap.height,
          type: activeTarget,
          quality: quality / 100,
        });
        bitmap.close();
        out.push({
          name: outputName(file.name, "", FORMAT_EXTENSION[activeTarget]),
          blob,
          originalSize: file.size,
        });
      }
      setResults(out);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed.");
    } finally {
      setBusy(null);
    }
  }

  const targetLabel = FORMAT_LABEL[activeTarget];

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        {note && <p className="text-sm leading-relaxed text-ink-mute">{note}</p>}
        <FileDropzone
          id="convert-input"
          label="Drop images here or click to choose"
          hint={`Converts to ${targetLabel}.`}
          accept={inputTypes}
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

      <div className="rounded-2xl border border-ink/10 bg-paper-raised p-5 space-y-6">
        {!fixedTarget && (
          <div>
            <label htmlFor="convert-target" className="text-sm font-medium text-ink">
              Convert to
            </label>
            <select
              id="convert-target"
              value={target}
              onChange={(e) => setTarget(e.target.value as RasterFormat)}
              className="field mt-2"
            >
              {ALL_TARGETS.map((t) => (
                <option key={t} value={t}>
                  {FORMAT_LABEL[t]}
                </option>
              ))}
            </select>
          </div>
        )}

        {activeTarget !== "image/png" && (
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="convert-quality" className="text-sm font-medium text-ink">
                Quality
              </label>
              <span className="font-mono text-sm">{quality}</span>
            </div>
            <input
              id="convert-quality"
              type="range"
              min={40}
              max={100}
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              className="mt-3 w-full accent-cobalt"
            />
          </div>
        )}

        <p className="text-xs leading-relaxed text-ink-mute">
          {activeTarget === "image/jpeg"
            ? "JPG has no transparency, so transparent areas become white."
            : activeTarget === "image/png"
              ? "PNG is lossless and keeps transparency, but files are usually larger than JPG."
              : "WebP is small and keeps transparency. Very old browsers may not open it."}
        </p>

        <button type="button" onClick={convert} disabled={busy !== null || files.length === 0} className="btn-primary w-full">
          Convert to {targetLabel}
        </button>
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message={busy.message} progress={busy.progress} />}
        {error && <ErrorStatus message={error} />}
        {results.length > 0 && (
          <section aria-label="Results" className="mt-2 space-y-3">
            <SuccessStatus message={`Converted ${results.length} ${results.length === 1 ? "image" : "images"} to ${targetLabel}.`} />
            {results.map((r) => (
              <ResultRow key={r.name + r.blob.size} filename={r.name} blob={r.blob} />
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
