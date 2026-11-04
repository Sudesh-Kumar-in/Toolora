"use client";

import { useMemo, useState } from "react";
import { calculatePercent, parseNumber, type PercentMode } from "@/lib/student";
import { CopyButton } from "@/components/tools/shared/copy-button";

const MODES: { id: PercentMode; label: string; a: string; b: string; sentence: (a: string, b: string) => string }[] = [
  { id: "of", label: "X% of a number", a: "Percentage (X)", b: "Number", sentence: (a, b) => `${a}% of ${b}` },
  { id: "isWhat", label: "A is what % of B", a: "Part (A)", b: "Total (B)", sentence: (a, b) => `${a} is what % of ${b}` },
  { id: "change", label: "% change from A to B", a: "From (A)", b: "To (B)", sentence: (a, b) => `change from ${a} to ${b}` },
];

const DEFAULTS = { of: ["", ""], isWhat: ["", ""], change: ["", ""] } as const;

export default function PercentageCalculator() {
  const [mode, setMode] = useState<PercentMode>("of");
  const [values, setValues] = useState<Record<PercentMode, [string, string]>>({
    of: ["", ""], isWhat: ["", ""], change: ["", ""],
  });
  const current = MODES.find((m) => m.id === mode)!;
  const [a, b] = values[mode];

  const outcome = useMemo(() => {
    const na = parseNumber(a);
    const nb = parseNumber(b);
    if (na === null || nb === null) return { text: null as string | null, error: a || b ? "Enter two numbers." : null };
    const r = calculatePercent(mode, na, nb);
    if (!r.ok) return { text: null, error: r.error };
    const rounded = Math.round(r.value * 10000) / 10000;
    const suffix = mode === "change" ? "%" : mode === "isWhat" ? "%" : "";
    return { text: `${rounded}${suffix}`, error: null };
  }, [a, b, mode]);

  function setPair(index: 0 | 1, v: string) {
    setValues((prev) => {
      const pair: [string, string] = [...prev[mode]] as [string, string];
      pair[index] = v;
      return { ...prev, [mode]: pair };
    });
  }

  const summary = outcome.text
    ? mode === "of"
      ? `${a}% of ${b} = ${outcome.text}`
      : mode === "isWhat"
        ? `${a} is ${outcome.text} of ${b}`
        : `Change from ${a} to ${b} is ${outcome.text}`
    : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
      <div className="space-y-5">
        <div role="radiogroup" aria-label="Calculation type" className="grid gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={mode === m.id}
              onClick={() => setMode(m.id)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt ${
                mode === m.id ? "border-ink bg-ink text-paper-raised" : "border-ink/10 bg-paper-raised text-ink-soft hover:border-ink/25"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pc-a" className="text-sm font-medium text-ink">{current.a}</label>
            <input id="pc-a" inputMode="decimal" value={a} onChange={(e) => setPair(0, e.target.value)} className="field mt-2" placeholder="0" />
          </div>
          <div>
            <label htmlFor="pc-b" className="text-sm font-medium text-ink">{current.b}</label>
            <input id="pc-b" inputMode="decimal" value={b} onChange={(e) => setPair(1, e.target.value)} className="field mt-2" placeholder="0" />
          </div>
        </div>

        <button type="button" onClick={() => setValues((v) => ({ ...v, [mode]: [...DEFAULTS[mode]] as [string, string] }))} className="btn-secondary">
          Reset
        </button>
      </div>

      <aside aria-live="polite" className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        {outcome.error && <p role="alert" className="text-sm text-red-700">{outcome.error}</p>}
        {outcome.text ? (
          <>
            <p className="text-sm text-ink-mute">Result</p>
            <p className="mt-1 font-display text-5xl text-ink">{outcome.text}</p>
            <p className="mt-3 text-sm text-ink-soft">{summary}</p>
            <div className="mt-5"><CopyButton text={summary} label="Copy result" /></div>
          </>
        ) : (
          !outcome.error && <p className="text-sm text-ink-mute">Enter two numbers to see the result.</p>
        )}
      </aside>
    </div>
  );
}
