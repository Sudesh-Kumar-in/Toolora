"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { calculateMarks, parseNumber } from "@/lib/student";
import { CopyButton } from "@/components/tools/shared/copy-button";

interface Row { id: number; name: string; obtained: string; max: string }

const MAX_ROWS = 20;

export default function MarksCalculator() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "", obtained: "", max: "100" },
    { id: 2, name: "", obtained: "", max: "100" },
  ]);
  const [nextId, setNextId] = useState(3);

  const result = useMemo(() => {
    const filled = rows.filter((r) => r.obtained.trim() !== "" || r.max.trim() !== "");
    if (filled.length === 0) return { ok: false as const, error: "Enter marks for at least one subject." };
    const parsed = filled.map((r) => ({ obtained: parseNumber(r.obtained), max: parseNumber(r.max) }));
    if (parsed.some((p) => p.obtained === null || p.max === null)) {
      return { ok: false as const, error: "Every subject needs both marks obtained and maximum marks." };
    }
    return calculateMarks(parsed as { obtained: number; max: number }[]);
  }, [rows]);

  function update(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const summary = result.ok
    ? `Total ${result.value.totalObtained} of ${result.value.totalMax} (${result.value.percentage.toFixed(2)}%)`
    : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="mb-2 hidden grid-cols-[1fr_6rem_6rem_2.5rem] gap-3 px-1 text-xs font-medium text-ink-mute sm:grid">
          <span>Subject (optional)</span><span>Obtained</span><span>Maximum</span><span className="sr-only">Remove</span>
        </div>
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.id} className="grid grid-cols-[1fr_6rem_6rem_2.5rem] gap-3">
              <input aria-label={`Subject ${i + 1} name`} value={row.name} onChange={(e) => update(row.id, { name: e.target.value })} placeholder={`Subject ${i + 1}`} className="field" />
              <input aria-label={`Subject ${i + 1} marks obtained`} inputMode="decimal" value={row.obtained} onChange={(e) => update(row.id, { obtained: e.target.value })} placeholder="Got" className="field" />
              <input aria-label={`Subject ${i + 1} maximum marks`} inputMode="decimal" value={row.max} onChange={(e) => update(row.id, { max: e.target.value })} placeholder="Max" className="field" />
              <button type="button" onClick={() => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== row.id) : p))} disabled={rows.length === 1} aria-label={`Remove subject ${i + 1}`} className="flex items-center justify-center rounded-xl text-ink-mute hover:bg-ink/5 hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" disabled={rows.length >= MAX_ROWS} onClick={() => { setRows((p) => [...p, { id: nextId, name: "", obtained: "", max: "100" }]); setNextId((n) => n + 1); }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add subject
          </button>
          <button type="button" className="btn-secondary" onClick={() => setRows([{ id: nextId, name: "", obtained: "", max: "100" }])}>Reset</button>
        </div>
      </div>

      <aside aria-live="polite" className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        {result.ok ? (
          <>
            <p className="text-sm text-ink-mute">Overall percentage</p>
            <p className="mt-1 font-display text-6xl text-ink">{result.value.percentage.toFixed(2)}%</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-paper p-3"><dt className="text-ink-mute">Total</dt><dd className="font-semibold">{result.value.totalObtained} / {result.value.totalMax}</dd></div>
              <div className="rounded-xl bg-paper p-3"><dt className="text-ink-mute">Average per subject</dt><dd className="font-semibold">{result.value.average.toFixed(2)}</dd></div>
            </dl>
            <div className="mt-5"><CopyButton text={summary} label="Copy summary" /></div>
          </>
        ) : (
          <p role={result.error ? "alert" : undefined} className="text-sm text-ink-mute">{result.error}</p>
        )}
      </aside>
    </div>
  );
}
