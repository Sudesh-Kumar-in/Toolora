"use client";

import { useMemo, useState } from "react";
import { Download, Plus, Save, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { newId } from "@/lib/ids";
import { filterNotes, type Note } from "@/lib/productivity";
import { downloadBlob } from "@/lib/download";

const MAX_NOTES = 500;

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export default function NotesManager() {
  const { value: notes, setValue: setNotes, ready } = useLocalStorage<Note[]>("toolora:notes", []);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedNote, setSavedNote] = useState(false);

  const visible = useMemo(() => filterNotes(notes, query), [notes, query]);
  const selected = notes.find((n) => n.id === selectedId) ?? null;
  const dirty = selected !== null && (draftTitle !== selected.title || draftBody !== selected.body);

  function open(note: Note) {
    setSelectedId(note.id);
    setDraftTitle(note.title);
    setDraftBody(note.body);
    setError(null);
    setSavedNote(false);
  }

  function newNote() {
    if (notes.length >= MAX_NOTES) return setError(`You can keep up to ${MAX_NOTES} notes. Delete some to add more.`);
    const note: Note = { id: newId(), title: "", body: "", updatedAt: Date.now() };
    setNotes((p) => [note, ...p]);
    open(note);
  }

  function save() {
    if (!selected) return;
    const title = draftTitle.trim();
    if (!title && !draftBody.trim()) return setError("Add a title or some text before saving.");
    setError(null);
    setNotes((p) => p.map((n) => (n.id === selected.id ? { ...n, title: title || "Untitled", body: draftBody, updatedAt: Date.now() } : n)));
    setDraftTitle(title || "Untitled");
    setSavedNote(true);
  }

  function remove(id: string) {
    if (!window.confirm("Delete this note?")) return;
    setNotes((p) => p.filter((n) => n.id !== id));
    if (selectedId === id) {
      setSelectedId(null);
      setDraftTitle("");
      setDraftBody("");
    }
  }

  function download() {
    if (!selected) return;
    const safeName = (selected.title || "note").replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-") || "note";
    downloadBlob(new Blob([`${draftTitle}\n\n${draftBody}`], { type: "text/plain;charset=utf-8" }), `${safeName}.txt`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <div className="flex gap-2">
          <label htmlFor="notes-search" className="sr-only">Search notes</label>
          <input id="notes-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" className="field" />
          <button type="button" onClick={newNote} className="btn-primary shrink-0 !px-4" aria-label="New note"><Plus className="h-4 w-4" aria-hidden="true" /></button>
        </div>
        {!ready ? (
          <p className="text-sm text-ink-mute">Loading notes…</p>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ink/20 p-6 text-center text-sm text-ink-mute">
            {notes.length === 0 ? "No notes yet. Create your first one." : "No notes match your search."}
          </p>
        ) : (
          <ul className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
            {visible.map((n) => (
              <li key={n.id}>
                <button type="button" onClick={() => open(n)} aria-current={selectedId === n.id} className={`w-full rounded-xl border p-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt ${selectedId === n.id ? "border-ink bg-paper-raised" : "border-ink/10 bg-paper-raised hover:border-ink/25"}`}>
                  <span className="block truncate font-medium text-ink">{n.title || "Untitled"}</span>
                  <span className="mt-1 block truncate text-xs text-ink-mute">{n.body || "No text"}</span>
                  <span className="mt-1 block text-xs text-ink-mute">{formatDate(n.updatedAt)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="min-h-[420px] rounded-3xl border border-ink/10 bg-paper-raised p-5 shadow-card sm:p-6">
        {!selected ? (
          <div className="flex h-full min-h-[360px] items-center justify-center text-center text-sm text-ink-mute">
            Select a note on the left, or create a new one.
          </div>
        ) : (
          <div className="flex h-full flex-col gap-4">
            <div>
              <label htmlFor="note-title" className="text-sm font-medium text-ink">Title</label>
              <input id="note-title" value={draftTitle} onChange={(e) => { setDraftTitle(e.target.value); setSavedNote(false); }} maxLength={160} className="field mt-2" />
            </div>
            <div className="flex min-h-0 flex-1 flex-col">
              <label htmlFor="note-body" className="text-sm font-medium text-ink">Note</label>
              <textarea id="note-body" value={draftBody} onChange={(e) => { setDraftBody(e.target.value); setSavedNote(false); }} className="field mt-2 min-h-[260px] flex-1 resize-y leading-relaxed" />
            </div>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {savedNote && !dirty && <p role="status" className="text-sm text-ink-soft">Saved.</p>}
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={save} disabled={!dirty} className="btn-primary"><Save className="h-4 w-4" aria-hidden="true" />Save</button>
              <button type="button" onClick={download} className="btn-secondary"><Download className="h-4 w-4" aria-hidden="true" />Download .txt</button>
              <button type="button" onClick={() => remove(selected.id)} className="btn-secondary"><Trash2 className="h-4 w-4" aria-hidden="true" />Delete</button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
