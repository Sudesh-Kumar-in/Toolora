"use client";

import { useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { EMPTY_CV, cvToDoc, getTemplate, validateCv, type CvForm } from "@/lib/doc-model";
import { DocPreview } from "@/components/tools/shared/doc-preview";
import { DocExport } from "@/components/tools/shared/doc-export";

const MAX_ITEMS = 12;

export default function CvMaker() {
  const { value: form, setValue: setForm, ready } = useLocalStorage<CvForm>("toolora:cv-draft", EMPTY_CV);
  const { value: templateId } = useLocalStorage<string>("toolora:resume-template", "classic");
  const template = getTemplate(templateId);
  const doc = useMemo(() => cvToDoc(form), [form]);
  const problem = useMemo(() => validateCv(form), [form]);

  const set = <K extends keyof CvForm>(key: K, value: CvForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (!ready) return <p className="text-sm text-ink-mute">Loading your saved draft…</p>;

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-8">
        <section className="grid gap-4 sm:grid-cols-2">
          <TextField id="cv-name" label="Full name *" value={form.fullName} onChange={(v) => set("fullName", v)} />
          <TextField id="cv-title" label="Academic title (e.g. Associate Professor)" value={form.title} onChange={(v) => set("title", v)} />
          <TextField id="cv-email" label="Email *" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <TextField id="cv-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
          <TextField id="cv-aff" label="Department or institution" value={form.affiliation} onChange={(v) => set("affiliation", v)} className="sm:col-span-2" />
          <div className="sm:col-span-2">
            <label htmlFor="cv-research" className="text-sm font-medium text-ink">Research interests (separate with commas)</label>
            <textarea id="cv-research" rows={2} value={form.researchInterests} onChange={(e) => set("researchInterests", e.target.value)} className="field mt-2 resize-y" />
          </div>
        </section>

        <ListEditor
          title="Education"
          items={form.education}
          empty={{ degree: "", institution: "", year: "" }}
          onChange={(items) => set("education", items)}
          fields={[["degree", "Degree"], ["institution", "Institution"], ["year", "Years"]]}
        />

        <ListEditor
          title="Academic positions"
          items={form.positions}
          empty={{ title: "", institution: "", years: "" }}
          onChange={(items) => set("positions", items)}
          fields={[["title", "Position"], ["institution", "Institution"], ["years", "Years"]]}
        />

        <section className="space-y-4">
          <TextArea id="cv-pubs" label="Publications (one per line)" value={form.publications} onChange={(v) => set("publications", v)} rows={5} />
          <TextArea id="cv-teach" label="Teaching (one course per line)" value={form.teaching} onChange={(v) => set("teaching", v)} rows={3} />
          <TextArea id="cv-awards" label="Awards and grants (one per line)" value={form.awards} onChange={(v) => set("awards", v)} rows={3} />
        </section>

        <button type="button" className="btn-secondary" onClick={() => { if (window.confirm("Clear the whole CV?")) setForm(EMPTY_CV); }}>Reset CV</button>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <DocExport doc={doc} template={template} fileBase={`${form.fullName || "cv"}-cv`} validationError={problem} />
        <DocPreview doc={doc} template={template} />
      </div>
    </div>
  );
}

type Item = Record<string, string>;

function ListEditor<T extends Item>({ title, items, empty, onChange, fields }: {
  title: string; items: T[]; empty: T; onChange: (items: T[]) => void; fields: [keyof T & string, string][];
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-display">{title}</h2>
        <button type="button" className="btn-secondary" disabled={items.length >= MAX_ITEMS} onClick={() => onChange([...items, { ...empty }])}>
          <Plus className="h-4 w-4" aria-hidden="true" />Add
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} className="grid gap-3 rounded-2xl border border-ink/10 bg-paper-raised p-4 sm:grid-cols-[1fr_1fr_1fr_auto]">
          {fields.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={`${title}-${i}-${key}`} className="text-xs font-medium text-ink-mute">{label}</label>
              <input id={`${title}-${i}-${key}`} value={item[key]} onChange={(e) => onChange(items.map((x, k) => (k === i ? { ...x, [key]: e.target.value } : x)))} maxLength={160} className="field mt-1" />
            </div>
          ))}
          <div className="flex items-end">
            <button type="button" aria-label={`Remove ${title} entry ${i + 1}`} onClick={() => onChange(items.filter((_, k) => k !== i))} className="rounded-lg p-2.5 text-ink-mute hover:bg-ink/5 hover:text-ink"><Trash2 className="h-4 w-4" aria-hidden="true" /></button>
          </div>
        </div>
      ))}
    </section>
  );
}

function TextField({ id, label, value, onChange, type = "text", className = "" }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={160} className="field mt-2" />
    </div>
  );
}

function TextArea({ id, label, value, onChange, rows }: { id: string; label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <textarea id={id} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} maxLength={4000} className="field mt-2 resize-y" />
    </div>
  );
}
