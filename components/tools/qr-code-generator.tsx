"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { ErrorStatus } from "@/components/tools/shared/tool-status";
import { downloadBlob } from "@/lib/download";

type Level = "L" | "M" | "Q" | "H";

const MAX_LENGTH = 2000;

const LEVEL_HINT: Record<Level, string> = {
  L: "Smallest code. Use for clean, printed-quality surfaces.",
  M: "Balanced. A good default.",
  Q: "Tolerates some damage or logo overlay.",
  H: "Most resilient. Largest code, best for logos or harsh conditions.",
};

export default function QrCodeGenerator() {
  const [text, setText] = useState("https://");
  const [size, setSize] = useState(512);
  const [level, setLevel] = useState<Level>("M");
  const [fg, setFg] = useState("#101820");
  const [bg, setBg] = useState("#FFFFFF");
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const tooLong = text.length > MAX_LENGTH;

  // Debounced regeneration keeps typing smooth.
  useEffect(() => {
    if (!trimmed) {
      setPreview(null);
      setError(null);
      return;
    }
    if (tooLong) {
      setPreview(null);
      setError(`Keep the text under ${MAX_LENGTH} characters. It is currently ${text.length}.`);
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const QRCode = (await import("qrcode")).default;
        const url = await QRCode.toDataURL(trimmed, {
          width: 320,
          margin: 2,
          errorCorrectionLevel: level,
          color: { dark: fg, light: bg },
        });
        if (!cancelled) {
          setPreview(url);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("This QR code could not be generated. Check the colours and text.");
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmed, tooLong, text.length, level, fg, bg]);

  async function downloadPng() {
    if (!trimmed || tooLong) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const url = await QRCode.toDataURL(trimmed, {
        width: size,
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark: fg, light: bg },
      });
      const blob = await (await fetch(url)).blob();
      downloadBlob(blob, "qr-code.png");
    } catch {
      setError("PNG download failed. Try a smaller size.");
    }
  }

  async function downloadSvg() {
    if (!trimmed || tooLong) return;
    try {
      const QRCode = (await import("qrcode")).default;
      const svg = await QRCode.toString(trimmed, {
        type: "svg",
        margin: 2,
        errorCorrectionLevel: level,
        color: { dark: fg, light: bg },
      });
      downloadBlob(new Blob([svg], { type: "image/svg+xml" }), "qr-code.svg");
    } catch {
      setError("SVG download failed.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-6">
        <div>
          <label htmlFor="qr-text" className="text-sm font-medium text-ink">
            Link or text
          </label>
          <textarea
            id="qr-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="https://example.com or any text"
            aria-invalid={tooLong}
            aria-describedby="qr-help"
            className="field mt-2 resize-y"
          />
          <p id="qr-help" className="mt-2 text-xs text-ink-mute">
            Anything up to {MAX_LENGTH} characters. Your text stays in your browser.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="qr-size" className="text-sm font-medium text-ink">Download size</label>
            <select id="qr-size" value={size} onChange={(e) => setSize(Number(e.target.value))} className="field mt-2">
              <option value={256}>256 px</option>
              <option value={512}>512 px</option>
              <option value={1024}>1024 px</option>
            </select>
          </div>
          <div>
            <label htmlFor="qr-level" className="text-sm font-medium text-ink">Error correction</label>
            <select id="qr-level" value={level} onChange={(e) => setLevel(e.target.value as Level)} className="field mt-2">
              <option value="L">Low (L)</option>
              <option value="M">Medium (M)</option>
              <option value="Q">Quartile (Q)</option>
              <option value="H">High (H)</option>
            </select>
            <p className="mt-2 text-xs text-ink-mute">{LEVEL_HINT[level]}</p>
          </div>
          <div>
            <label htmlFor="qr-fg" className="text-sm font-medium text-ink">Foreground</label>
            <input id="qr-fg" type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-paper-raised p-1" />
          </div>
          <div>
            <label htmlFor="qr-bg" className="text-sm font-medium text-ink">Background</label>
            <input id="qr-bg" type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="mt-2 h-11 w-full cursor-pointer rounded-xl border border-ink/15 bg-paper-raised p-1" />
          </div>
        </div>
        <p className="text-xs text-ink-mute">
          Keep a strong contrast between the two colours so phones can scan the code.
        </p>
      </div>

      <div className="flex flex-col items-center rounded-2xl border border-ink/10 bg-paper-raised p-6 space-y-5">
        <div className="flex h-[320px] w-[320px] max-w-full items-center justify-center rounded-xl bg-paper">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={`QR code for ${trimmed.slice(0, 60)}`} width={320} height={320} className="h-auto w-full max-w-[320px] rounded-lg" />
          ) : (
            <p className="px-6 text-center text-sm text-ink-mute">Your QR code appears here.</p>
          )}
        </div>
        <div className="grid w-full gap-3 sm:grid-cols-2">
          <button type="button" onClick={downloadPng} disabled={!preview} className="btn-primary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download PNG
          </button>
          <button type="button" onClick={downloadSvg} disabled={!preview} className="btn-secondary">
            <Download className="h-4 w-4" aria-hidden="true" />
            Download SVG
          </button>
        </div>
      </div>

      {error && (
        <div className="lg:col-span-2">
          <ErrorStatus message={error} />
        </div>
      )}
    </div>
  );
}
