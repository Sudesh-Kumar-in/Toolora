"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Download, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { newId } from "@/lib/ids";
import { downloadBlob } from "@/lib/download";
import { isoDateOf } from "@/lib/dates";
import {
  APPLICATION_STATUSES, countByStatus, responseRate, toCsv, validateApplication,
  type Application, type ApplicationStatus,
} from "@/lib/productivity";


const EMPTY = { company: "", role: "", status: "Applied" as ApplicationStatus, appliedOn: "", link: "", notes: "" };

export default function JobApplicationTracker() {
  const { value: apps, setValue: setApps, ready } = useLocalStorage<Application[]>("toolora:applications", []);
  const [form, setForm] = useState(EMPTY);
  useEffect(() => { setForm((f) => (f.appliedOn ? f : { ...f, appliedOn: isoDateOf(new Date()) })); }, []);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ApplicationStatus | "All">("All");

  const counts = useMemo(() => countByStatus(apps), [apps]);
  const rate = useMemo(() => responseRate(apps), [apps]);
  const visible = useMemo(
    () => [...apps].sort((a, b) => b.appliedOn.localeCompare(a.appliedOn)).filter((a) => filter === "All" || a.status === filter),
    [apps, filter],
  );

  function onAdd(e: FormEvent) {
    e.preventDefault();
    const problem = validateApplication(form);
    if (problem) return setError(problem);
    setError(null);
    setApps((p) => [
      { id: newId(), company: form.company.trim(), role: form.role.trim(), status: form.status, appliedOn: form.appliedOn, link: form.link.trim(), notes: form.notes.trim() },
      ...p,
    ]);
    setForm({ ...EMPTY, appliedOn: form.appliedOn });
  }

  function changeStatus(id: string, status: ApplicationStatus) {
    setApps((p) => p.map((a) => (a.id === id ? { ...a, status } : a)));
  }

  function exportCsv() {
    downloadBlob(new Blob([toCsv(apps)], { type: "text/csv;charset=utf-8" }), "job-applications.csv");
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        {APPLICATION_STATUSES.map((s) => (
          <div key={s} className="rounded-2xl border border-ink/10 bg-paper-raised p-4">
            <p className="text-xs text-ink-mute">{s}</p>
            <p className="mt-1 font-display text-3xl text-ink">{counts[s]}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-ink-soft">Response rate (interviews or offers, excluding withdrawn): <span className="font-semibold text-ink">{rate}%</span></p>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        <form onSubmit={onAdd} noValidate className="h-fit space-y-4 rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
          <h3 className="text-lg">Add an application</h3>
          <div>
            <label htmlFor="ja-company" className="text-sm font-medium text-ink">Company</label>
            <input id="ja-company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} className="field mt-2" />
          </div>
          <div>
            <label htmlFor="ja-role" className="text-sm font-medium text-ink">Job title</label>
            <input id="ja-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} maxLength={120} className="field mt-2" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="ja-status" className="text-sm font-medium text-ink">Status</label>
              <select id="ja-status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ApplicationStatus })} className="field mt-2">
                {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="ja-date" className="text-sm font-medium text-ink">Applied on</label>
              <input id="ja-date" type="date" value={form.appliedOn} onChange={(e) => setForm({ ...form, appliedOn: e.target.value })} className="field mt-2" />
            </div>
          </div>
          <div>
            <label htmlFor="ja-link" className="text-sm font-medium text-ink">Job link (optional)</label>
            <input id="ja-link" type="url" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="https://" className="field mt-2" />
          </div>
          <div>
            <label htmlFor="ja-notes" className="text-sm font-medium text-ink">Notes (optional)</label>
            <textarea id="ja-notes" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} className="field mt-2 resize-y" />
          </div>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary w-full">Save application</button>
        </form>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2">
              {(["All", ...APPLICATION_STATUSES] as const).map((s) => (
                <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === s ? "bg-ink text-paper-raised" : "border border-ink/10 bg-paper-raised text-ink-soft"}`}>{s}</button>
              ))}
            </div>
            <button type="button" className="btn-secondary" disabled={apps.length === 0} onClick={exportCsv}><Download className="h-4 w-4" aria-hidden="true" />Export CSV</button>
          </div>

          {!ready ? (
            <p className="text-sm text-ink-mute">Loading applications…</p>
          ) : visible.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-ink/20 p-8 text-center text-sm text-ink-mute">{apps.length === 0 ? "No applications yet." : "No applications with this status."}</p>
          ) : (
            <ul className="space-y-3">
              {visible.map((a) => (
                <li key={a.id} className="rounded-2xl border border-ink/10 bg-paper-raised p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-ink break-words">{a.role}</p>
                      <p className="text-sm text-ink-soft break-words">{a.company} · applied {a.appliedOn}</p>
                      {a.link && <a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block break-all text-sm text-cobalt underline underline-offset-4">View job posting</a>}
                      {a.notes && <p className="mt-2 whitespace-pre-line text-sm text-ink-mute">{a.notes}</p>}
                    </div>
                    <button type="button" onClick={() => setApps((p) => p.filter((x) => x.id !== a.id))} aria-label={`Delete ${a.role} at ${a.company}`} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                    Status
                    <select value={a.status} onChange={(e) => changeStatus(a.id, e.target.value as ApplicationStatus)} aria-label={`Status for ${a.role} at ${a.company}`} className="field !w-auto !py-1.5">
                      {APPLICATION_STATUSES.map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
