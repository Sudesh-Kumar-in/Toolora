"use client";

import { useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { UploadCloud } from "lucide-react";
import { validateFiles, formatBytes, type FileRules } from "@/lib/files";

interface Props extends FileRules {
  id: string;
  label: string;
  hint: string;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function FileDropzone({ id, label, hint, onFiles, disabled, ...rules }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handle(list: FileList | File[] | null) {
    if (!list) return;
    const files = Array.from(list);
    const problem = validateFiles(files, rules);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    onFiles(files);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handle(e.dataTransfer.files);
  }

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      inputRef.current?.click();
    }
  }

  const accept = rules.accept.map((r) => (r.endsWith("/") ? `${r}*` : r)).join(",");

  return (
    <div>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-describedby={`${id}-hint`}
        onKeyDown={onKey}
        onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper ${
          dragging ? "border-cobalt bg-cobalt-wash" : "border-ink/20 bg-paper-raised hover:border-ink/40"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink text-paper">
          <UploadCloud className="h-6 w-6" aria-hidden="true" />
        </span>
        <span className="text-base font-medium text-ink">{label}</span>
        <span id={`${id}-hint`} className="text-sm text-ink-mute">
          {hint} Up to {formatBytes(rules.maxBytes)} per file.
        </span>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={rules.maxCount > 1}
          disabled={disabled}
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            handle(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
