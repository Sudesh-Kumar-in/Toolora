"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { decodeImage, FORMAT_EXTENSION, READABLE_IMAGE_TYPES, renderToBlob, type RasterFormat } from "@/lib/image";
import { aspectCropRect, clampRect, type CropRect } from "@/lib/photo";
import { outputName } from "@/lib/files";

const MAX_BYTES = 25 * 1024 * 1024;
const PREVIEW_MAX = 640;

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1 square", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "3:4", label: "3:4 portrait", ratio: 3 / 4 },
  { id: "9:16", label: "9:16 story", ratio: 9 / 16 },
];

export default function ImageCropper() {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [aspect, setAspect] = useState("free");
  const [format, setFormat] = useState<RasterFormat>("image/jpeg");
  const [quality, setQuality] = useState(92);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);
  const scale = bitmap ? Math.min(1, PREVIEW_MAX / Math.max(bitmap.width, bitmap.height)) : 1;

  // Load the chosen image and start with the whole picture selected.
  async function onFile(list: File[]) {
    setError(null);
    setResult(null);
    try {
      const bmp = await decodeImage(list[0], list[0].name);
      setBitmap((old) => { old?.close(); return bmp; });
      setFile(list[0]);
      setCrop({ x: 0, y: 0, width: bmp.width, height: bmp.height });
      setAspect("free");
    } catch (err) {
      setError(err instanceof Error ? err.message : "This image could not be opened.");
    }
  }

  useEffect(() => () => bitmap?.close(), [bitmap]);

  // Redraw the preview with the crop frame.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap || !crop) return;
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(bitmap, 0, 0, w, h);
    ctx.fillStyle = "rgba(16,24,32,0.55)";
    ctx.fillRect(0, 0, w, h);
    ctx.save();
    ctx.beginPath();
    ctx.rect(crop.x * scale, crop.y * scale, crop.width * scale, crop.height * scale);
    ctx.clip();
    ctx.drawImage(bitmap, 0, 0, w, h);
    ctx.restore();
    ctx.strokeStyle = "#2B4EFF";
    ctx.lineWidth = 2;
    ctx.strokeRect(crop.x * scale, crop.y * scale, crop.width * scale, crop.height * scale);
  }, [bitmap, crop, scale]);

  function applyAspect(id: string) {
    setAspect(id);
    if (!bitmap) return;
    const preset = ASPECTS.find((a) => a.id === id);
    if (!preset || preset.ratio === null) return;
    setCrop(aspectCropRect(bitmap.width, bitmap.height, preset.ratio));
  }

  function setField(key: keyof CropRect, value: string) {
    if (!bitmap || !crop) return;
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const next = { ...crop, [key]: Math.round(n) };
    setAspect("free");
    setCrop(clampRect(next, bitmap.width, bitmap.height));
  }

  // Drag the crop frame to move it.
  function pointerDown(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!crop || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    if (px < crop.x || px > crop.x + crop.width || py < crop.y || py > crop.y + crop.height) return;
    drag.current = { dx: px - crop.x, dy: py - crop.y };
    canvasRef.current.setPointerCapture(e.pointerId);
  }

  function pointerMove(e: ReactPointerEvent<HTMLCanvasElement>) {
    if (!drag.current || !crop || !bitmap || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / scale;
    const py = (e.clientY - rect.top) / scale;
    setCrop(clampRect({ ...crop, x: px - drag.current.dx, y: py - drag.current.dy }, bitmap.width, bitmap.height));
  }

  function pointerUp() {
    drag.current = null;
  }

  async function cropAndSave() {
    setError(null);
    setResult(null);
    if (!file || !bitmap || !crop) return setError("Choose an image first.");
    if (crop.width < 2 || crop.height < 2) return setError("The crop area is too small. Make it at least 2 pixels wide and tall.");
    setBusy(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = crop.width;
      canvas.height = crop.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Your browser could not start image processing.");
      if (format === "image/jpeg") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, crop.width, crop.height);
      }
      ctx.drawImage(bitmap, crop.x, crop.y, crop.width, crop.height, 0, 0, crop.width, crop.height);
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This browser could not save the image."))), format, format === "image/png" ? undefined : quality / 100),
      );
      setResult({ name: outputName(file.name, `-cropped-${crop.width}x${crop.height}`, FORMAT_EXTENSION[format]), blob, originalSize: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cropping failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        {!bitmap ? (
          <FileDropzone id="crop-input" label="Drop an image here or click to choose" hint="JPG, PNG or WebP." accept={READABLE_IMAGE_TYPES} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
        ) : (
          <div className="rounded-2xl border border-ink/10 bg-paper-raised p-3">
            <canvas
              ref={canvasRef}
              aria-label={`Crop preview of ${file?.name}. Drag the blue frame to move it.`}
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
              onPointerCancel={pointerUp}
              className="mx-auto block h-auto max-w-full cursor-move touch-none rounded-lg"
            />
            <p className="mt-2 text-center text-xs text-ink-mute">Drag the frame to move it. Use the fields to resize it.</p>
          </div>
        )}
      </div>

      <div className="space-y-5 rounded-2xl border border-ink/10 bg-paper-raised p-5">
        {bitmap && crop ? (
          <>
            <div>
              <label htmlFor="crop-aspect" className="text-sm font-medium text-ink">Shape</label>
              <select id="crop-aspect" value={aspect} onChange={(e) => applyAspect(e.target.value)} className="field mt-2">
                {ASPECTS.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {(["x", "y", "width", "height"] as const).map((k) => (
                <div key={k}>
                  <label htmlFor={`crop-${k}`} className="text-sm font-medium capitalize text-ink">{k === "x" ? "Left (px)" : k === "y" ? "Top (px)" : k === "width" ? "Width (px)" : "Height (px)"}</label>
                  <input id={`crop-${k}`} type="number" inputMode="numeric" value={crop[k]} onChange={(e) => setField(k, e.target.value)} className="field mt-2" />
                </div>
              ))}
            </div>
            <p className="text-xs text-ink-mute">Source image: {bitmap.width} × {bitmap.height} px. Output: {crop.width} × {crop.height} px.</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="crop-format" className="text-sm font-medium text-ink">Format</label>
                <select id="crop-format" value={format} onChange={(e) => setFormat(e.target.value as RasterFormat)} className="field mt-2">
                  <option value="image/jpeg">JPG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                </select>
              </div>
              <div>
                <label htmlFor="crop-quality" className="text-sm font-medium text-ink">Quality {quality}</label>
                <input id="crop-quality" type="range" min={40} max={100} value={quality} onChange={(e) => setQuality(Number(e.target.value))} disabled={format === "image/png"} className="mt-4 w-full accent-cobalt disabled:opacity-40" />
              </div>
            </div>
            <button type="button" onClick={cropAndSave} disabled={busy} className="btn-primary w-full">Crop and save</button>
            <button type="button" className="btn-secondary w-full" onClick={() => { setBitmap(null); setFile(null); setCrop(null); setResult(null); setError(null); }}>Choose another image</button>
          </>
        ) : (
          <p className="text-sm text-ink-mute">Choose an image to start cropping.</p>
        )}
      </div>

      <div className="lg:col-span-2">
        {busy && <BusyStatus message="Cropping image" />}
        {error && <ErrorStatus message={error} />}
        {result && (
          <section aria-label="Result" className="mt-2 space-y-3">
            <SuccessStatus message="Your cropped image is ready." />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
