"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import { SAMPLE_RESUME, TEMPLATES, resumeToDoc, type TemplateId } from "@/lib/doc-model";
import { DocPreview } from "@/components/tools/shared/doc-preview";
import { DocExport } from "@/components/tools/shared/doc-export";

export default function ResumeTemplates() {
  const { value: selected, setValue: setSelected } = useLocalStorage<string>("toolora:resume-template", "classic");
  const sample = resumeToDoc(SAMPLE_RESUME);

  return (
    <div className="space-y-10">
      <p className="max-w-2xl text-sm leading-relaxed text-ink-soft">
        Preview each layout with sample content, download a sample to see it in full, then choose one. Your choice carries over to the Resume Builder, CV Maker and Cover Letter Generator.
      </p>
      <div className="grid gap-8 lg:grid-cols-3">
        {Object.values(TEMPLATES).map((t) => {
          const isSelected = selected === t.id;
          return (
            <article key={t.id} className="flex flex-col gap-5 rounded-3xl border border-ink/10 bg-paper-raised p-5 shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl">{t.label}</h2>
                  <p className="mt-1 text-sm text-ink-mute">{t.description}</p>
                </div>
                {isSelected && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-cobalt-wash px-2.5 py-1 text-xs font-medium text-cobalt">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" />Selected
                  </span>
                )}
              </div>
              <div className="max-h-[420px] overflow-hidden rounded-xl bg-paper-sunk p-3">
                <div className="origin-top scale-[0.75] sm:scale-[0.9]">
                  <DocPreview doc={sample} template={t} />
                </div>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button type="button" onClick={() => setSelected(t.id as TemplateId)} aria-pressed={isSelected} className={isSelected ? "btn-secondary" : "btn-primary"}>
                  {isSelected ? "Using this template" : "Use this template"}
                </button>
                <Link href="/tools/resume-builder" className="btn-secondary">Open Resume Builder</Link>
                <DocExport doc={sample} template={t} fileBase={`sample-${t.id}-resume`} validationError={null} />
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
