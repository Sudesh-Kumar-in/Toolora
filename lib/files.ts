/** Dependency-free helpers shared by tools. Keep this file free of imports. */

export interface FileLike {
  name: string;
  type: string;
  size: number;
}

export interface FileRules {
  /** MIME types, or prefixes ending in "/" such as "image/". */
  accept: string[];
  maxBytes: number;
  maxCount: number;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

/** Percentage saved going from `before` to `after`. Negative means the file grew. */
export function percentSaved(before: number, after: number): number {
  if (before <= 0) return 0;
  return Math.round(((before - after) / before) * 100);
}

export function isAccepted(file: FileLike, accept: string[]): boolean {
  return accept.some((rule) =>
    rule.endsWith("/") ? file.type.startsWith(rule) : file.type === rule,
  );
}

/** Returns a user-facing error for the first problem found, or null if all files pass. */
export function validateFiles(files: FileLike[], rules: FileRules): string | null {
  if (files.length === 0) return "Choose at least one file to continue.";
  if (files.length > rules.maxCount) {
    return `You can add up to ${rules.maxCount} ${rules.maxCount === 1 ? "file" : "files"} at a time.`;
  }
  for (const file of files) {
    if (!isAccepted(file, rules.accept)) {
      return `"${file.name}" is not a supported file type.`;
    }
    if (file.size === 0) {
      return `"${file.name}" is empty.`;
    }
    if (file.size > rules.maxBytes) {
      return `"${file.name}" is larger than ${formatBytes(rules.maxBytes)}.`;
    }
  }
  return null;
}

/** "photo.final.jpg" + "-compressed" + "jpg" -> "photo.final-compressed.jpg" */
export function outputName(original: string, suffix: string, extension: string): string {
  const base = original.replace(/\.[^.]+$/, "") || "file";
  return `${base}${suffix}.${extension}`;
}

export interface Size {
  width: number;
  height: number;
}

const MAX_DIMENSION = 10000;

/**
 * Works out output dimensions. With aspect lock on, a single entered
 * dimension derives the other, and if both are entered the width wins.
 * Without the lock, each dimension is used as entered (blank means keep source).
 */
export function computeDimensions(
  source: Size,
  input: { width?: number; height?: number; lockAspect: boolean },
): Size {
  const { width, height, lockAspect } = input;
  const ratio = source.width / source.height;

  let w = width ?? source.width;
  let h = height ?? source.height;

  if (lockAspect) {
    if (width !== undefined) {
      h = Math.round(width / ratio);
    } else if (height !== undefined) {
      w = Math.round(height * ratio);
    }
  }

  const clamp = (n: number) => Math.min(MAX_DIMENSION, Math.max(1, Math.round(n)));
  return { width: clamp(w), height: clamp(h) };
}
