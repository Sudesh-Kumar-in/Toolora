"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  EMPTY_RESUME, TEMPLATES, getTemplate, resumeToDoc, validateResume, type ResumeForm, type TemplateId,
} from "@/lib/doc-model";
import { DocPreview } from "@/components/tools/shared/doc-preview";
import { DocExport } from "@/components/tools/shared/doc-export";

const MAX_JOBS = 10;
const MAX_EDUCATION = 6;

export default function ResumeBuilder() {
  const { value: form, setValue: setForm, ready } = useLocalStorage<ResumeForm>("toolora:resume-draft", EMPTY_RESUME);
  const { value: templateId, setValue: setTemplateId } = useLocalStorage<string>("toolora:resume-template", "classic");
  const template = getTemplate(templateId);

  const doc = useMemo(() => resumeToDoc(form), [form]);
  const problem = useMemo(() => validateResume(form), [form]);

  const set = <K extends keyof ResumeForm>(key: K, value: ResumeForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (!ready) return <p className="text-sm text-ink-mute">Loading your saved draft…</p>;

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-8">
        <fieldset className="space-y-4">
          <legend className="text-lg font-display">Template</legend>
          <div role="radiogroup" aria-label="Template" className="grid grid-cols-3 gap-2">
            {Object.values(TEMPLATES).map((t) => (
              <button key={t.id} type="button" role="radio" aria-checked={templateId === t.id} onClick={() => setTemplateId(t.id as TemplateId)}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium ${templateId === t.id ? "border-ink bg-ink text-paper-raised" : "border-ink/10 bg-paper-raised text-ink-soft"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </fieldset>

        <section className="space-y-4">
          <h2 className="text-lg font-display">Personal details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="rb-name" label="Full name *" value={form.fullName} onChange={(v) => set("fullName", v)} autoComplete="name" />
            <Field id="rb-headline" label="Headline (e.g. Software Engineer)" value={form.headline} onChange={(v) => set("headline", v)} />
            <Field id="rb-email" label="Email *" type="email" value={form.email} onChange={(v) => set("email", v)} autoComplete="email" />
            <Field id="rb-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} autoComplete="tel" />
            <Field id="rb-location" label="Location" value={form.location} onChange={(v) => set("location", v)} />
            <Field id="rb-web" label="Website or portfolio" value={form.website} onChange={(v) => set("website", v)} />
          </div>
          <div>
            <label htmlFor="rb-summary" className="text-sm font-medium text-ink">Professional summary</label>
            <textarea id="rb-summary" rows={3} value={form.summary} onChange={(e) => set("summary", e.target.value)} maxLength={800} className="field mt-2 resize-y" />
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display">Work experience</h2>
            <button type="button" className="btn-secondary" disabled={form.experience.length >= MAX_JOBS}
              onClick={() => set("experience", [...form.experience, { role: "", company: "", place: "", start: "", end: "", current: false, bullets: "" }])}>
              <Plus className="h-4 w-4" aria-hidden="true" />Add job
            </button>
          </div>
          {form.experience.length === 0 && <p className="text-sm text-ink-mute">No jobs added yet.</p>}
          {form.experience.map((job, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-ink/10 bg-paper-raised p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Job {i + 1}</p>
                <button type="button" aria-label={`Remove job ${i + 1}`} onClick={() => set("experience", form.experience.filter((_, k) => k !== i))} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id={`job-${i}-role`} label="Job title" value={job.role} onChange={(v) => set("experience", form.experience.map((x, k) => k === i ? { ...x, role: v } : x))} />
                <Field id={`job-${i}-company`} label="Company" value={job.company} onChange={(v) => set("experience", form.experience.map((x, k) => k === i ? { ...x, company: v } : x))} />
                <Field id={`job-${i}-place`} label="Location (optional)" value={job.place} onChange={(v) => set("experience", form.experience.map((x, k) => k === i ? { ...x, place: v } : x))} />
                <div className="grid grid-cols-2 gap-3">
                  <Field id={`job-${i}-start`} label="Start" placeholder="2021 or Jan 2021" value={job.start} onChange={(v) => set("experience", form.experience.map((x, k) => k === i ? { ...x, start: v } : x))} />
                  <Field id={`job-${i}-end`} label="End" placeholder="2024" disabled={job.current} value={job.end} onChange={(v) => set("experience", form.experience.map((x, k) => k === i ? { ...x, end: v } : x))} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-ink-soft">
                <input type="checkbox" className="accent-cobalt" checked={job.current} onChange={(e) => set("experience", form.experience.map((x, k) => k === i ? { ...x, current: e.target.checked } : x))} />
                I currently work here
              </label>
              <div>
                <label htmlFor={`job-${i}-bullets`} className="text-sm font-medium text-ink">Achievements (one per line)</label>
                <textarea id={`job-${i}-bullets`} rows={3} value={job.bullets} onChange={(e) => set("experience", form.experience.map((x, k) => k === i ? { ...x, bullets: e.target.value } : x))} className="field mt-2 resize-y" />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display">Education</h2>
            <button type="button" className="btn-secondary" disabled={form.education.length >= MAX_EDUCATION}
              onClick={() => set("education", [...form.education, { degree: "", school: "", year: "", details: "" }])}>
              <Plus className="h-4 w-4" aria-hidden="true" />Add education
            </button>
          </div>
          {form.education.map((ed, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-ink/10 bg-paper-raised p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-ink">Qualification {i + 1}</p>
                <button type="button" aria-label={`Remove qualification ${i + 1}`} onClick={() => set("education", form.education.filter((_, k) => k !== i))} className="rounded-lg p-2 text-ink-mute hover:bg-ink/5 hover:text-ink"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id={`ed-${i}-degree`} label="Degree" value={ed.degree} onChange={(v) => set("education", form.education.map((x, k) => k === i ? { ...x, degree: v } : x))} />
                <Field id={`ed-${i}-school`} label="School" value={ed.school} onChange={(v) => set("education", form.education.map((x, k) => k === i ? { ...x, school: v } : x))} />
                <Field id={`ed-${i}-year`} label="Years" value={ed.year} onChange={(v) => set("education", form.education.map((x, k) => k === i ? { ...x, year: v } : x))} />
              </div>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <label htmlFor="rb-skills" className="text-sm font-medium text-ink">Skills (separate with commas)</label>
            <textarea id="rb-skills" rows={2} value={form.skills} onChange={(e) => set("skills", e.target.value)} className="field mt-2 resize-y" />
          </div>
          <div>
            <label htmlFor="rb-certs" className="text-sm font-medium text-ink">Certifications (one per line)</label>
            <textarea id="rb-certs" rows={2} value={form.certifications} onChange={(e) => set("certifications", e.target.value)} className="field mt-2 resize-y" />
          </div>
        </section>

        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn-secondary" onClick={() => { if (window.confirm("Clear the whole resume? This cannot be undone.")) setForm(EMPTY_RESUME); }}>Reset resume</button>
          <span className="self-center text-xs text-ink-mute">Your draft saves automatically in this browser.</span>
        </div>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <DocExport doc={doc} template={template} fileBase={`${form.fullName || "resume"}-resume`} validationError={problem} />
        <DocPreview doc={doc} template={template} />
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange, type = "text", placeholder, autoComplete, disabled }: {
  id: string; label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; autoComplete?: string; disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} disabled={disabled} maxLength={160} className="field mt-2 disabled:opacity-50" />
    </div>
  );
}
