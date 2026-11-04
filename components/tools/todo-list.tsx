"use client";
import { newId } from "@/lib/ids";

import { useState, type FormEvent } from "react";
import { Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { addTodo, clearCompleted, removeTodo, toggleTodo, type TodoItem } from "@/lib/productivity";

type Filter = "all" | "active" | "done";

export default function TodoList() {
  const { value: items, setValue: setItems, ready } = useLocalStorage<TodoItem[]>("toolora:todo", []);
  const [text, setText] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);

  const visible = items.filter((t) => filter === "all" || (filter === "done" ? t.done : !t.done));
  const remaining = items.filter((t) => !t.done).length;
  const doneCount = items.length - remaining;

  function onAdd(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return setError("Type a task before adding it.");
    setError(null);
    setItems((prev) => addTodo(prev, text, newId(), Date.now()));
    setText("");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <form onSubmit={onAdd} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="todo-text" className="sr-only">New task</label>
        <input id="todo-text" value={text} onChange={(e) => { setText(e.target.value); setError(null); }} placeholder="Add a task and press Enter" maxLength={200} aria-invalid={!!error} aria-describedby={error ? "todo-err" : undefined} className="field flex-1" />
        <button type="submit" className="btn-primary">Add task</button>
      </form>
      {error && <p id="todo-err" role="alert" className="text-sm text-red-700">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show tasks" className="flex gap-2">
          {(["all", "active", "done"] as Filter[]).map((f) => (
            <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)} className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${filter === f ? "bg-ink text-paper-raised" : "bg-paper-raised text-ink-soft border border-ink/10"}`}>
              {f === "all" ? `All (${items.length})` : f === "active" ? `Active (${remaining})` : `Done (${doneCount})`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-secondary" disabled={doneCount === 0} onClick={() => setItems((p) => clearCompleted(p))}>Clear completed</button>
          <button type="button" className="btn-secondary" disabled={items.length === 0} onClick={() => { if (window.confirm("Delete every task? This cannot be undone.")) setItems([]); }}>Reset</button>
        </div>
      </div>

      {!ready ? (
        <p className="text-sm text-ink-mute">Loading your tasks…</p>
      ) : visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink-mute">
          {items.length === 0 ? "No tasks yet. Add your first one above." : "No tasks in this view."}
        </p>
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-paper-raised">
          {visible.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <input id={`todo-${t.id}`} type="checkbox" checked={t.done} onChange={() => setItems((p) => toggleTodo(p, t.id))} className="h-5 w-5 shrink-0 accent-cobalt" />
              <label htmlFor={`todo-${t.id}`} className={`min-w-0 flex-1 cursor-pointer break-words text-sm ${t.done ? "text-ink-mute line-through" : "text-ink"}`}>{t.text}</label>
              <button type="button" onClick={() => setItems((p) => removeTodo(p, t.id))} aria-label={`Delete ${t.text}`} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-ink-mute">Tasks are saved in this browser only. Clearing site data removes them.</p>
    </div>
  );
}
