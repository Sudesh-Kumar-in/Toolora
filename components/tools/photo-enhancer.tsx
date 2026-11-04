"use client";

import { useEffect, useRef, useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { decodeImage, READABLE_IMAGE_TYPES } from "@/lib/image";
import { applyAdjustments, autoLevels, sharpen } from "@/lib/imageops";
import { outputName } from "@/lib/files";

const MAX_BYTES = 25 * 1024 * 1024;
const WORK_MAX = 1200; // longest side used for live editing; the export uses the same size

const DEFAULTS = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0, levels: false };

export default function PhotoEnhancer() {
  const [file, setFile] = useState<File | null>(null);
  const [original, setOriginal] = useState<ImageData | null>(null);
  const [settings, setSettings] = useState(DEFAULTS);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);
  const originalCanvas = useRef<HTMLCanvasElement>(null);
  const outputCanvas = useRef<HTMLCanvasElement>(null);

  async function onFile(list: File[]) {
    setError(null);
    setResult(null);
    try {
      const bmp = await decodeImage(list[0], list[0].name);
      const scale = Math.min(1, WORK_MAX / Math.max(bmp.width, bmp.height));
      const w = Math.max(1, Math.round(bmp.width * scale));
      const h = Math.max(1, Math.round(bmp.height * scale));
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const ctx = c.getContext("2d");
      if (!ctx) throw new Error("Your browser could not start image processing.");
      ctx.drawImage(bmp, 0, 0, w, h);
      bmp.close();
      setOriginal(ctx.getImageData(0, 0, w, h));
      setFile(list[0]);
      setSettings(DEFAULTS);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This image could not be opened.");
    }
  }

  // Draw the untouched original once.
  useEffect(() => {
    const c = originalCanvas.current;
    if (!c || !original) return;
    c.width = original.width;
    c.height = original.height;
    c.getContext("2d")?.putImageData(original, 0, 0);
  }, [original]);

  // Re-run the pipeline whenever a setting changes. Each run starts from the original pixels.
  useEffect(() => {
    const out = outputCanvas.current;
    if (!out || !original) return;
    const frame = requestAnimationFrame(() => {
      const data = new Uint8ClampedArray(original.data);
      if (settings.levels) autoLevels(data);
      applyAdjustments(data, { brightness: settings.brightness, contrast: settings.contrast, saturation: settings.saturation });
      sharpen(data, original.width, original.height, settings.sharpness / 100 * 1.5);
      out.width = original.width;
      out.height = original.height;
      out.getContext("2d")?.putImageData(new ImageData(data, original.width, original.height), 0, 0);
    });
    return () => cancelAnimationFrame(frame);
  }, [original, settings]);

  function set<K extends keyof typeof DEFAULTS>(key: K, value: (typeof DEFAULTS)[K]) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function save(type: "image/png" | "image/jpeg") {
    setError(null);
    setResult(null);
    const canvas = outputCanvas.current;
    if (!canvas || !file) return setError("Choose a photo first.");
    setBusy(true);
    try {
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This browser could not save the photo."))), type, 0.93),
      );
      const ext = type === "image/png" ? "png" : "jpg";
      setResult({ name: outputName(file.name, "-enhanced", ext), blob, originalSize: file.size });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Saving failed.");
    } finally {
      setBusy(false);
    }
  }

  const sliders: { key: "brightness" | "contrast" | "saturation" | "sharpness"; label: string; min: number; max: number }[] = [
    { key: "brightness", label: "Brightness", min: -100, max: 100 },
    { key: "contrast", label: "Contrast", min: -100, max: 100 },
    { key: "saturation", label: "Colour saturation", min: -100, max: 100 },
    { key: "sharpness", label: "Sharpness", min: 0, max: 100 },
  ];

  return (
    <div className="space-y-8">
      {!original ? (
        <FileDropzone id="enh-input" label="Drop a photo here or click to choose" hint="JPG, PNG or WebP. Large photos are reduced to 1200 px for editing." accept={READABLE_IMAGE_TYPES} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
      ) : (
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          <div className="space-y-6 rounded-2xl border border-ink/10 bg-paper-raised p-5">
            {sliders.map((s) => (
              <div key={s.key}>
                <div className="flex justify-between text-sm">
                  <label htmlFor={`enh-${s.key}`} className="font-medium text-ink">{s.label}</label>
                  <span className="font-mono">{settings[s.key]}</span>
                </div>
                <input id={`enh-${s.key}`} type="range" min={s.min} max={s.max} value={settings[s.key]} onChange={(e) => set(s.key, Number(e.target.value))} className="mt-2 w-full accent-cobalt" />
              </div>
            ))}
            <label className="flex cursor-pointer items-center gap-3 text-sm text-ink">
              <input type="checkbox" className="h-4 w-4 accent-cobalt" checked={settings.levels} onChange={(e) => set("levels", e.target.checked)} />
              Auto levels (stretch the tonal range to full black and white)
            </label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={() => save("image/jpeg")}>Save as JPG</button>
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => save("image/png")}>Save as PNG</button>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-secondary" onClick={() => setSettings(DEFAULTS)}>Reset adjustments</button>
              <button type="button" className="btn-secondary" onClick={() => { setOriginal(null); setFile(null); setResult(null); setError(null); }}>Choose another photo</button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium text-ink-soft">Original</figcaption>
              <canvas ref={originalCanvas} aria-label="Original photo" className="h-auto w-full rounded-xl border border-ink/10 bg-paper-raised" />
            </figure>
            <figure className="space-y-2">
              <figcaption className="text-sm font-medium text-ink-soft">Enhanced</figcaption>
              <canvas ref={outputCanvas} aria-label="Enhanced photo preview" className="h-auto w-full rounded-xl border border-ink/10 bg-paper-raised" />
            </figure>
          </div>
        </div>
      )}

      {busy && <BusyStatus message="Saving photo" />}
      {error && <ErrorStatus message={error} />}
      {result && (
        <section aria-label="Result" className="space-y-3">
          <SuccessStatus message="Your enhanced photo is ready." />
          <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
        </section>
      )}
    </div>
  );
}
