"use client";

export type RasterFormat = "image/jpeg" | "image/png" | "image/webp";

export const FORMAT_EXTENSION: Record<RasterFormat, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const FORMAT_LABEL: Record<RasterFormat, string> = {
  "image/jpeg": "JPG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

/** Formats the browser can read and draw. SVG, HEIC and GIF are intentionally excluded. */
export const READABLE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp"];

export async function decodeImage(file: Blob, name = "image"): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(file);
  } catch {
    throw new Error(
      `"${name}" could not be read as an image. The file may be damaged or in an unsupported format.`,
    );
  }
}

export interface RenderOptions {
  width: number;
  height: number;
  type: RasterFormat;
  /** 0–1, only used for JPEG and WebP. */
  quality?: number;
}

/**
 * Draws a bitmap onto a canvas at the requested size and encodes it.
 * JPEG has no transparency, so transparent areas are flattened onto white.
 */
export async function renderToBlob(
  bitmap: ImageBitmap,
  { width, height, type, quality = 0.9 }: RenderOptions,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not start image processing.");

  if (type === "image/jpeg") {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error(`This browser could not encode the image as ${FORMAT_LABEL[type]}.`));
      },
      type,
      type === "image/png" ? undefined : quality,
    );
  });
}

export function isRasterFormat(type: string): type is RasterFormat {
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}
