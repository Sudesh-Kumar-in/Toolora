"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";

type Row = { id: number; name: string; credits: string; points: string };

const MAX_ROWS = 20;

function newRow(id: number): Row {
  return { id, name: "", credits: "", points: "" };
}

/**
 * Validates one row. Returns an error message, or null when the row is valid.
 * Empty rows are ignored rather than flagged, so people can leave spares blank.
 */
function validateRow(row: Row, scale: number): string | null {
  const creditsEmpty = row.credits.trim() === "";
  const pointsEmpty = row.points.trim() === "";
  if (creditsEmpty && pointsEmpty) return null;
  if (creditsEmpty) return "Enter the credits for this subject.";
  if (pointsEmpty) return "Enter the grade points for this subject.";

  const credits = Number(row.credits);
  const points = Number(row.points);
  if (!Number.isFinite(credits) || credits <= 0 || credits > 30)
    return "Credits should be a number between 0 and 30.";
  if (!Number.isFinite(points) || points < 0 || points > scale)
    return `Grade points should be between 0 and ${scale}.`;
  return null;
}

export default function CgpaCalculator() {
  const [scale, setScale] = useState<number>(10);
  const [nextId, setNextId] = useState(3);
  const [rows, setRows] = useState<Row[]>([
    { id: 1, name: "", credits: "4", points: "" },
    { id: 2, name: "", credits: "3", points: "" },
    { id: 3, name: "", credits: "2", points: "" },
  ]);

  const { errors, cgpa, totalCredits } = useMemo(() => {
    const errs: Record<number, string> = {};
    let weighted = 0;
    let credits = 0;

    for (const row of rows) {
      const err = validateRow(row, scale);
      if (err) {
        errs[row.id] = err;
        continue;
      }
      if (row.credits.trim() && row.points.trim()) {
        const c = Number(row.credits);
        weighted += Number(row.points) * c;
        credits += c;
      }
    }

    const hasErrors = Object.keys(errs).length > 0;
    return {
      errors: errs,
      totalCredits: credits,
      cgpa: !hasErrors && credits > 0 ? weighted / credits : null,
    };
  }, [rows, scale]);

  function update(id: number, field: keyof Omit<Row, "id">, value: string) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    if (rows.length >= MAX_ROWS) return;
    setRows((prev) => [...prev, newRow(nextId)]);
    setNextId((n) => n + 1);
  }

  function removeRow(id: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.id !== id) : prev));
  }

  function reset() {
    setRows([newRow(nextId)]);
    setNextId((n) => n + 1);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <label htmlFor="cgpa-scale" className="text-sm font-medium text-ink">
              Grading scale
            </label>
            <select
              id="cgpa-scale"
              value={scale}
              onChange={(e) => setScale(Number(e.target.value))}
              className="field mt-2 w-auto pr-9"
            >
              <option value={10}>Out of 10</option>
              <option value={4}>Out of 4</option>
            </select>
          </div>
          <button type="button" onClick={reset} className="btn-secondary">
            Reset
          </button>
        </div>

        <div className="hidden grid-cols-[1fr_6rem_6rem_2.5rem] gap-3 px-1 text-xs font-medium text-ink-mute sm:grid">
          <span>Subject (optional)</span>
          <span>Credits</span>
          <span>Grade points</span>
          <span className="sr-only">Remove</span>
        </div>

        <ul className="mt-2 space-y-3">
          {rows.map((row, index) => {
            const err = errors[row.id];
            const errId = `cgpa-err-${row.id}`;
            return (
              <li key={row.id}>
                <div className="grid grid-cols-[1fr_6rem_6rem_2.5rem] gap-3">
                  <input
                    aria-label={`Subject ${index + 1} name`}
                    value={row.name}
                    onChange={(e) => update(row.id, "name", e.target.value)}
                    placeholder={`Subject ${index + 1}`}
                    className="field"
                  />
                  <input
                    aria-label={`Subject ${index + 1} credits`}
                    aria-invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    inputMode="decimal"
                    value={row.credits}
                    onChange={(e) => update(row.id, "credits", e.target.value)}
                    placeholder="Credits"
                    className="field"
                  />
                  <input
                    aria-label={`Subject ${index + 1} grade points`}
                    aria-invalid={!!err}
                    aria-describedby={err ? errId : undefined}
                    inputMode="decimal"
                    value={row.points}
                    onChange={(e) => update(row.id, "points", e.target.value)}
                    placeholder={`0–${scale}`}
                    className="field"
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(row.id)}
                    disabled={rows.length === 1}
                    aria-label={`Remove subject ${index + 1}`}
                    className="flex h-full items-center justify-center rounded-xl text-ink-mute transition-colors hover:bg-ink/5 hover:text-ink disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
                {err && (
                  <p id={errId} className="mt-1.5 text-sm text-red-700">
                    {err}
                  </p>
                )}
              </li>
            );
          })}
        </ul>

        <button
          type="button"
          onClick={addRow}
          disabled={rows.length >= MAX_ROWS}
          className="btn-secondary mt-5"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Add subject
        </button>
        <p className="mt-2 text-xs text-ink-mute">
          You can add up to {MAX_ROWS} subjects.
        </p>
      </div>

      <aside
        aria-live="polite"
        className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card lg:sticky lg:top-24"
      >
        <p className="text-sm text-ink-mute">Your CGPA</p>
        <p className="mt-1 font-display text-6xl text-ink">
          {cgpa === null ? "—" : cgpa.toFixed(2)}
        </p>
        <p className="mt-2 text-sm text-ink-mute">
          {cgpa === null
            ? "Enter credits and grade points for at least one subject."
            : `Out of ${scale}, across ${totalCredits} credits.`}
        </p>

        {cgpa !== null && scale === 10 && (
          <div className="mt-6 rounded-2xl bg-cobalt-wash p-4">
            <p className="text-sm text-ink-soft">Approximate percentage</p>
            <p className="mt-1 font-display text-3xl text-ink">
              {(cgpa * 9.5).toFixed(2)}%
            </p>
            <p className="mt-1 text-xs text-ink-mute">
              Uses the common CGPA × 9.5 convention. Your university may use a
              different formula.
            </p>
          </div>
        )}

        <div className="mt-6 border-t border-ink/10 pt-4 text-xs leading-relaxed text-ink-mute">
          CGPA = Σ (grade points × credits) ÷ Σ credits. Grade points come
          straight from your marksheet.
        </div>
      </aside>
    </div>
  );
}
