"use client";

import { useEffect, useRef, useState } from "react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { decodeImage, READABLE_IMAGE_TYPES } from "@/lib/image";
import { aspectCropRect, mmToPixels, PASSPORT_PRESETS, sheetLayout } from "@/lib/photo";
import { downloadBlob } from "@/lib/download";

const MAX_BYTES = 25 * 1024 * 1024;
const DPI = 300;
const SHEET_W_MM = 101.6; // 4 × 6 in
const SHEET_H_MM = 152.4;

function toBlob(canvas: HTMLCanvasElement, type: "image/jpeg" | "image/png"): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This browser could not save the photo."))), type, 0.95),
  );
}

export default function PassportPhotoMaker() {
  const [file, setFile] = useState<File | null>(null);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [presetId, setPresetId] = useState(PASSPORT_PRESETS[0].id);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [background, setBackground] = useState("#FFFFFF");
  const [copies, setCopies] = useState(6);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [results, setResults] = useState<{ name: string; blob: Blob; originalSize?: number }[]>([]);
  const previewRef = useRef<HTMLCanvasElement>(null);

  const preset = PASSPORT_PRESETS.find((p) => p.id === presetId) ?? PASSPORT_PRESETS[0];
  const outW = mmToPixels(preset.widthMm, DPI);
  const outH = mmToPixels(preset.heightMm, DPI);
  const layout = sheetLayout(SHEET_W_MM, SHEET_H_MM, preset.widthMm, preset.heightMm);

  useEffect(() => () => bitmap?.close(), [bitmap]);

  async function onFile(list: File[]) {
    setError(null);
    setResults([]);
    try {
      const bmp = await decodeImage(list[0], list[0].name);
      setBitmap((old) => { old?.close(); return bmp; });
      setFile(list[0]);
      setZoom(1);
      setOffsetX(0);
      setOffsetY(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "This image could not be opened.");
    }
  }

  function cropRect() {
    if (!bitmap) return null;
    return aspectCropRect(bitmap.width, bitmap.height, outW / outH, zoom, offsetX, offsetY);
  }

  // Live preview of the framed photo with a background colour and guide lines.
  useEffect(() => {
    const canvas = previewRef.current;
    const rect = cropRect();
    if (!canvas || !bitmap || !rect) return;
    const maxH = 360;
    const s = maxH / outH;
    canvas.width = Math.round(outW * s);
    canvas.height = Math.round(outH * s);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
    // Guides: eye line at one third and centre line.
    ctx.strokeStyle = "rgba(43,78,255,0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 3); ctx.lineTo(canvas.width, canvas.height / 3);
    ctx.moveTo(canvas.width / 2, 0); ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    setWarning(
      rect.width < outW * 0.9 && bitmap.width > 0
        ? "This photo is smaller than the photo size at 300 dpi, so the print may look soft. Use a larger original if you can."
        : null,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bitmap, zoom, offsetX, offsetY, background, presetId]);

  function renderPhoto(): HTMLCanvasElement {
    const rect = cropRect();
    if (!bitmap || !rect) throw new Error("Choose a photo first.");
    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not start image processing.");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, outW, outH);
    ctx.drawImage(bitmap, rect.x, rect.y, rect.width, rect.height, 0, 0, outW, outH);
    return canvas;
  }

  async function makePhoto() {
    setError(null);
    setResults([]);
    if (!file || !bitmap) return setError("Choose a photo first.");
    setBusy(true);
    try {
      const canvas = renderPhoto();
      const base = file.name.replace(/\.[^.]+$/, "");
      const blob = await toBlob(canvas, "image/jpeg");
      setResults([{ name: `${base}-passport-${preset.widthMm}x${preset.heightMm}mm.jpg`, blob, originalSize: file.size }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make the photo.");
    } finally {
      setBusy(false);
    }
  }

  async function makeSheet() {
    setError(null);
    setResults([]);
    if (!file || !bitmap) return setError("Choose a photo first.");
    if (layout.count === 0) return setError("This photo size does not fit on a 4 × 6 inch sheet.");
    const n = Math.min(copies, layout.count);
    setBusy(true);
    try {
      const photo = renderPhoto();
      const sheet = document.createElement("canvas");
      sheet.width = mmToPixels(SHEET_W_MM, DPI);
      sheet.height = mmToPixels(SHEET_H_MM, DPI);
      const ctx = sheet.getContext("2d");
      if (!ctx) throw new Error("Your browser could not start image processing.");
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, sheet.width, sheet.height);
      const marginPx = mmToPixels(5, DPI);
      const gapPx = mmToPixels(3, DPI);
      for (let i = 0; i < n; i++) {
        const col = i % layout.columns;
        const row = Math.floor(i / layout.columns);
        ctx.drawImage(photo, marginPx + col * (outW + gapPx), marginPx + row * (outH + gapPx), outW, outH);
      }
      const blob = await toBlob(sheet, "image/jpeg");
      setResults([{ name: `passport-sheet-${n}x-${preset.widthMm}x${preset.heightMm}mm-4x6in.jpg`, blob }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make the sheet.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-5">
        <FileDropzone id="passport-input" label="Drop a photo here or click to choose" hint="A clear, front-facing photo works best." accept={READABLE_IMAGE_TYPES} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy} />
        <div>
          <label htmlFor="passport-size" className="text-sm font-medium text-ink">Photo size</label>
          <select id="passport-size" value={presetId} onChange={(e) => setPresetId(e.target.value)} className="field mt-2">
            {PASSPORT_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <p className="mt-2 text-xs text-ink-mute">Check your country&apos;s official photo rules before you submit. Requirements vary, and this tool does not detect faces automatically, so frame the photo yourself.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex justify-between text-sm"><label htmlFor="passport-zoom" className="font-medium text-ink">Zoom</label><span className="font-mono">{zoom.toFixed(2)}×</span></div>
            <input id="passport-zoom" type="range" min={1} max={3} step={0.05} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="mt-2 w-full accent-cobalt" />
          </div>
          <div>
            <label htmlFor="passport-bg" className="text-sm font-medium text-ink">Background</label>
            <input id="passport-bg" type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-paper-raised p-1" />
          </div>
          <div>
            <div className="flex justify-between text-sm"><label htmlFor="passport-x" className="font-medium text-ink">Move left / right</label><span className="font-mono">{Math.round(offsetX * 100)}</span></div>
            <input id="passport-x" type="range" min={-100} max={100} value={offsetX * 100} onChange={(e) => setOffsetX(Number(e.target.value) / 100)} className="mt-2 w-full accent-cobalt" />
          </div>
          <div>
            <div className="flex justify-between text-sm"><label htmlFor="passport-y" className="font-medium text-ink">Move up / down</label><span className="font-mono">{Math.round(offsetY * 100)}</span></div>
            <input id="passport-y" type="range" min={-100} max={100} value={offsetY * 100} onChange={(e) => setOffsetY(Number(e.target.value) / 100)} className="mt-2 w-full accent-cobalt" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => { setZoom(1); setOffsetX(0); setOffsetY(0); }}>Centre photo</button>
          <button type="button" className="btn-secondary" onClick={() => { setBitmap(null); setFile(null); setResults([]); setError(null); }}>Choose another photo</button>
        </div>
      </div>

      <div className="space-y-5">
        <div className="flex flex-col items-center rounded-2xl border border-ink/10 bg-paper-raised p-5">
          {bitmap ? (
            <canvas ref={previewRef} aria-label="Passport photo preview" className="h-auto max-h-[360px] w-auto max-w-full rounded-md border border-ink/10" />
          ) : (
            <p className="py-16 text-center text-sm text-ink-mute">Your framed photo appears here.</p>
          )}
          <p className="mt-3 text-xs text-ink-mute">Output: {outW} × {outH} px at 300 dpi ({preset.widthMm} × {preset.heightMm} mm)</p>
        </div>
        {warning && <p role="status" className="rounded-xl bg-amber-wash px-4 py-3 text-sm text-ink-soft">{warning}</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="btn-primary" disabled={!bitmap || busy} onClick={makePhoto}>Make single photo</button>
          <div className="flex gap-2">
            <label htmlFor="passport-copies" className="sr-only">Photos on sheet</label>
            <input id="passport-copies" type="number" min={1} max={Math.max(1, layout.count)} value={copies} onChange={(e) => setCopies(Math.max(1, Number(e.target.value) || 1))} className="field w-20" />
            <button type="button" className="btn-secondary flex-1" disabled={!bitmap || busy} onClick={makeSheet}>4×6 sheet</button>
          </div>
        </div>
        <p className="text-xs text-ink-mute">A 4 × 6 inch sheet fits up to {layout.count} of this size.</p>

        {busy && <BusyStatus message="Making photo" />}
        {error && <ErrorStatus message={error} />}
        {results.length > 0 && (
          <section aria-label="Result" className="space-y-3">
            <SuccessStatus message="Your photo is ready. Print it at 100% scale or without fit-to-page." />
            {results.map((r) => <ResultRow key={r.name} filename={r.name} blob={r.blob} originalSize={r.originalSize} />)}
          </section>
        )}
      </div>
    </div>
  );
}
