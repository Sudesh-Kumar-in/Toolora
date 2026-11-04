"use client";

import { Download } from "lucide-react";
import { formatBytes } from "@/lib/files";
import { downloadBlob } from "@/lib/download";

export function ResultRow({
  filename,
  blob,
  originalSize,
}: {
  filename: string;
  blob: Blob;
  originalSize?: number;
}) {
  const saved =
    originalSize !== undefined && originalSize > 0
      ? Math.round(((originalSize - blob.size) / originalSize) * 100)
      : null;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper-raised p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate font-medium text-ink">{filename}</p>
        <p className="mt-0.5 text-sm text-ink-mute">
          {formatBytes(blob.size)}
          {originalSize !== undefined && <> · was {formatBytes(originalSize)}</>}
          {saved !== null && saved > 0 && <> · {saved}% smaller</>}
          {saved !== null && saved < 0 && <> · {Math.abs(saved)}% larger</>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => downloadBlob(blob, filename)}
        className="btn-primary w-full shrink-0 sm:w-auto"
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Download
      </button>
    </div>
  );
}
