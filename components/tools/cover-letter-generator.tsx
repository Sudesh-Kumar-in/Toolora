"use client";

import { useEffect, useMemo } from "react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { isoDateOf } from "@/lib/dates";
import { EMPTY_COVER, coverToDoc, getTemplate, validateCover, type CoverForm } from "@/lib/doc-model";
import { DocPreview } from "@/components/tools/shared/doc-preview";
import { DocExport } from "@/components/tools/shared/doc-export";

export default function CoverLetterGenerator() {
  const { value: form, setValue: setForm, ready } = useLocalStorage<CoverForm>("toolora:cover-draft", EMPTY_COVER);
  const { value: templateId } = useLocalStorage<string>("toolora:resume-template", "classic");
  const template = getTemplate(templateId);

  // Default the letter date to today once the draft has loaded (avoids server/client mismatch).
  useEffect(() => {
    if (ready && !form.letterDate) setForm((f) => ({ ...f, letterDate: isoDateOf(new Date()) }));
  }, [ready, form.letterDate, setForm]);

  const doc = useMemo(() => coverToDoc(form), [form]);
  const problem = useMemo(() => validateCover(form), [form]);
  const set = <K extends keyof CoverForm>(key: K, value: CoverForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  if (!ready) return <p className="text-sm text-ink-mute">Loading your saved draft…</p>;

  const count = (s: string) => `${s.trim().length} characters`;

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        <p className="text-sm leading-relaxed text-ink-soft">
          Fill in the details and write three short, specific sentences. The generator arranges them into a
          standard cover letter. It does not write the content for you, so the letter stays in your words.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <In id="cl-name" label="Your name *" value={form.yourName} onChange={(v) => set("yourName", v)} />
          <In id="cl-email" label="Email *" type="email" value={form.email} onChange={(v) => set("email", v)} />
          <In id="cl-phone" label="Phone" type="tel" value={form.phone} onChange={(v) => set("phone", v)} />
          <In id="cl-date" label="Letter date *" type="date" value={form.letterDate} onChange={(v) => set("letterDate", v)} />
          <In id="cl-company" label="Company *" value={form.company} onChange={(v) => set("company", v)} />
          <In id="cl-recipient" label="Hiring manager name (optional)" value={form.recipientName} onChange={(v) => set("recipientName", v)} />
          <In id="cl-role" label="Job title you are applying for *" value={form.roleTitle} onChange={(v) => set("roleTitle", v)} className="sm:col-span-2" />
        </div>
        <Area id="cl-open" label="Opening: why you are applying (at least 20 characters)" value={form.opening} onChange={(v) => set("opening", v)} hint={count(form.opening)} placeholder="I have spent six years building tools for small businesses, and I want to bring that experience to your team." />
        <Area id="cl-ach" label="One specific achievement (at least 20 characters)" value={form.achievement} onChange={(v) => set("achievement", v)} hint={count(form.achievement)} placeholder="I redesigned the checkout flow and increased completed orders by 18% in one quarter." />
        <Area id="cl-why" label="Why this company (at least 20 characters)" value={form.whyCompany} onChange={(v) => set("whyCompany", v)} hint={count(form.whyCompany)} placeholder="Your published commitment to accessible design matches how I already work." />
        <Area id="cl-close" label="Closing (optional; a standard closing is used if empty)" value={form.closing} onChange={(v) => set("closing", v)} hint="" placeholder="" />
        <button type="button" className="btn-secondary" onClick={() => { if (window.confirm("Clear the letter?")) setForm({ ...EMPTY_COVER, letterDate: isoDateOf(new Date()) }); }}>Reset letter</button>
      </div>

      <div className="space-y-6 xl:sticky xl:top-24 xl:h-fit">
        <DocExport doc={doc} template={template} fileBase={`${form.company || "cover"}-cover-letter`} validationError={problem} />
        <DocPreview doc={doc} template={template} />
      </div>
    </div>
  );
}

function In({ id, label, value, onChange, type = "text", className = "" }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; className?: string }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} maxLength={160} className="field mt-2" />
    </div>
  );
}

function Area({ id, label, value, onChange, hint, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; hint: string; placeholder: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-ink">{label}</label>
      <textarea id={id} rows={3} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} maxLength={800} className="field mt-2 resize-y" />
      {hint && <p className="mt-1 text-xs text-ink-mute">{hint}</p>}
    </div>
  );
}
