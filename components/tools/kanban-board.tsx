"use client";

import { useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { newId } from "@/lib/ids";
import { addCard, KANBAN_COLUMNS, moveCard, type KanbanCard, type KanbanColumn } from "@/lib/productivity";

const LABEL: Record<KanbanColumn, string> = { todo: "To do", doing: "Doing", done: "Done" };

export default function KanbanBoard() {
  const { value: cards, setValue: setCards, ready } = useLocalStorage<KanbanCard[]>("toolora:kanban", []);
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return setError("Type a card title first.");
    setError(null);
    setCards((prev) => addCard(prev, title, newId()));
    setTitle("");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="kb-title" className="sr-only">New card</label>
        <input id="kb-title" value={title} onChange={(e) => { setTitle(e.target.value); setError(null); }} maxLength={200} placeholder="New card, e.g. Write lab report" aria-invalid={!!error} className="field flex-1" />
        <button type="submit" className="btn-primary">Add card</button>
        <button type="button" className="btn-secondary" disabled={cards.length === 0} onClick={() => { if (window.confirm("Clear the whole board?")) setCards([]); }}>Reset board</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}

      {!ready ? (
        <p className="text-sm text-ink-mute">Loading board…</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {KANBAN_COLUMNS.map((col) => {
            const inColumn = cards.filter((c) => c.column === col);
            return (
              <section key={col} aria-labelledby={`col-${col}`} className="flex min-h-[200px] flex-col rounded-2xl border border-ink/10 bg-paper-sunk/60 p-3">
                <h3 id={`col-${col}`} className="flex items-center justify-between px-2 py-1.5 text-base">
                  {LABEL[col]}
                  <span className="rounded-full bg-paper-raised px-2 py-0.5 text-xs text-ink-mute">{inColumn.length}</span>
                </h3>
                <ul className="mt-2 space-y-2">
                  {inColumn.length === 0 && <li className="px-2 py-6 text-center text-sm text-ink-mute">Nothing here</li>}
                  {inColumn.map((card) => {
                    const first = col === "todo";
                    const last = col === "done";
                    return (
                      <li key={card.id} className="rounded-xl border border-ink/10 bg-paper-raised p-3 shadow-card">
                        <p className="break-words text-sm font-medium text-ink">{card.title}</p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <button type="button" disabled={first} onClick={() => setCards((p) => moveCard(p, card.id, -1))} aria-label={`Move "${card.title}" left to ${LABEL[KANBAN_COLUMNS[KANBAN_COLUMNS.indexOf(col) - 1]] ?? ""}`} className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" onClick={() => setCards((p) => p.filter((c) => c.id !== card.id))} aria-label={`Delete "${card.title}"`} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button type="button" disabled={last} onClick={() => setCards((p) => moveCard(p, card.id, 1))} aria-label={`Move "${card.title}" right to ${LABEL[KANBAN_COLUMNS[KANBAN_COLUMNS.indexOf(col) + 1]] ?? ""}`} className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                            <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
      <p className="text-xs text-ink-mute">Use the arrows on each card to move it between columns. Cards are saved in this browser only.</p>
    </div>
  );
}
