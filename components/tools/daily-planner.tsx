"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { newId } from "@/lib/ids";
import { findOverlaps, sortBlocks, totalPlannedMinutes, validateBlock, type TimeBlock } from "@/lib/productivity";
import { isoDateOf } from "@/lib/dates";

function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default function DailyPlanner() {
  const [date, setDate] = useState("");
  useEffect(() => { setDate(isoDateOf(new Date())); }, []);
  const { value: blocks, setValue: setBlocks, ready } = useLocalStorage<TimeBlock[]>(`toolora:planner:${date}`, []);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [error, setError] = useState<string | null>(null);

  const sorted = useMemo(() => sortBlocks(blocks), [blocks]);
  const overlaps = useMemo(() => findOverlaps(blocks), [blocks]);
  const overlapping = new Set(overlaps.flat());

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const problem = validateBlock(title, start, end);
    if (problem) return setError(problem);
    setError(null);
    setBlocks((prev) => [...prev, { id: newId(), title: title.trim().slice(0, 120), start, end }]);
    setTitle("");
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-5">
        <div>
          <label htmlFor="plan-date" className="text-sm font-medium text-ink">Plan for</label>
          <input id="plan-date" type="date" value={date} onChange={(e) => { setDate(e.target.value); setError(null); }} className="field mt-2" />
        </div>

        <form onSubmit={onAdd} className="space-y-4 rounded-2xl border border-ink/10 bg-paper-raised p-5">
          <div>
            <label htmlFor="plan-title" className="text-sm font-medium text-ink">What is it?</label>
            <input id="plan-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Revise chemistry" className="field mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-start" className="text-sm font-medium text-ink">Start</label>
              <input id="plan-start" type="time" value={start} onChange={(e) => setStart(e.target.value)} className="field mt-2" />
            </div>
            <div>
              <label htmlFor="plan-end" className="text-sm font-medium text-ink">End</label>
              <input id="plan-end" type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="field mt-2" />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full">Add to plan</button>
        </form>
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-soft">
            {sorted.length} {sorted.length === 1 ? "block" : "blocks"} · {formatMinutes(totalPlannedMinutes(blocks))} planned
          </p>
          <button type="button" className="btn-secondary" disabled={blocks.length === 0} onClick={() => { if (window.confirm("Clear every block for this day?")) setBlocks([]); }}>Reset day</button>
        </div>

        {overlaps.length > 0 && (
          <p role="status" className="mb-4 rounded-xl bg-amber-wash px-4 py-3 text-sm text-ink-soft">
            {overlaps.length} overlapping {overlaps.length === 1 ? "pair" : "pairs"} highlighted. Adjust times so blocks do not clash.
          </p>
        )}

        {!ready ? (
          <p className="text-sm text-ink-mute">Loading your plan…</p>
        ) : sorted.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink-mute">Nothing planned for this day yet.</p>
        ) : (
          <ol className="space-y-3">
            {sorted.map((b) => (
              <li key={b.id} className={`flex items-center gap-4 rounded-2xl border bg-paper-raised p-4 ${overlapping.has(b.id) ? "border-amber" : "border-ink/10"}`}>
                <p className="w-28 shrink-0 font-mono text-sm text-ink-soft">{b.start}–{b.end}</p>
                <p className="min-w-0 flex-1 break-words font-medium text-ink">{b.title}</p>
                <button type="button" onClick={() => setBlocks((p) => p.filter((x) => x.id !== b.id))} aria-label={`Remove ${b.title}`} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
