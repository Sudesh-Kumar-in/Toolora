"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { calculateGpa, GRADE_POINTS } from "@/lib/student";
import { CopyButton } from "@/components/tools/shared/copy-button";

interface Row { id: number; grade: string; credits: string }

const MAX_ROWS = 15;

export default function GpaCalculator() {
  const [rows, setRows] = useState<Row[]>([
    { id: 1, grade: "A", credits: "3" },
    { id: 2, grade: "B+", credits: "3" },
    { id: 3, grade: "", credits: "" },
  ]);
  const [nextId, setNextId] = useState(4);

  const result = useMemo(() => {
    const entries = rows.filter((r) => r.grade !== "" || r.credits.trim() !== "");
    return calculateGpa(
      entries.map((r) => ({ grade: r.grade, credits: r.credits.trim() === "" ? NaN : Number(r.credits) })),
    );
  }, [rows]);

  function update(id: number, patch: Partial<Row>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <ul className="space-y-3">
          {rows.map((row, i) => (
            <li key={row.id} className="grid grid-cols-[1fr_1fr_2.5rem] gap-3">
              <div>
                <label htmlFor={`gpa-grade-${row.id}`} className="sr-only">Course {i + 1} grade</label>
                <select id={`gpa-grade-${row.id}`} value={row.grade} onChange={(e) => update(row.id, { grade: e.target.value })} className="field">
                  <option value="">Grade</option>
                  {Object.keys(GRADE_POINTS).map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor={`gpa-cr-${row.id}`} className="sr-only">Course {i + 1} credit hours</label>
                <input id={`gpa-cr-${row.id}`} inputMode="decimal" value={row.credits} onChange={(e) => update(row.id, { credits: e.target.value })} placeholder="Credit hours" className="field" />
              </div>
              <button
                type="button"
                onClick={() => setRows((p) => (p.length > 1 ? p.filter((r) => r.id !== row.id) : p))}
                disabled={rows.length === 1}
                aria-label={`Remove course ${i + 1}`}
                className="flex items-center justify-center rounded-xl text-ink-mute hover:bg-ink/5 hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" disabled={rows.length >= MAX_ROWS} onClick={() => { setRows((p) => [...p, { id: nextId, grade: "", credits: "" }]); setNextId((n) => n + 1); }}>
            <Plus className="h-4 w-4" aria-hidden="true" /> Add course
          </button>
          <button type="button" className="btn-secondary" onClick={() => setRows([{ id: nextId, grade: "", credits: "" }])}>Reset</button>
        </div>
        <p className="mt-4 text-xs text-ink-mute">Grade points use the standard 4.0 scale: A 4.0, A− 3.7, B+ 3.3, B 3.0, B− 2.7, C+ 2.3, C 2.0, C− 1.7, D+ 1.3, D 1.0, F 0.</p>
      </div>

      <aside aria-live="polite" className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        {result.ok ? (
          <>
            <p className="text-sm text-ink-mute">Grade point average</p>
            <p className="mt-1 font-display text-6xl text-ink">{result.value.gpa.toFixed(2)}</p>
            <p className="mt-2 text-sm text-ink-soft">Across {result.value.totalCredits} credit hours.</p>
            <div className="mt-5"><CopyButton text={`GPA: ${result.value.gpa.toFixed(2)} (${result.value.totalCredits} credits)`} label="Copy GPA" /></div>
          </>
        ) : (
          <p className="text-sm text-ink-mute">{result.error}</p>
        )}
      </aside>
    </div>
  );
}
