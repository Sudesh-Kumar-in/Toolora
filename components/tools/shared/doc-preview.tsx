import type { DocModel, TemplateStyle } from "@/lib/doc-model";

/** HTML preview that mirrors the PDF and Word layouts for the chosen template. */
export function DocPreview({ doc, template }: { doc: DocModel; template: TemplateStyle }) {
  const accent = template.accentHex;
  const family = template.font === "Times-Roman" ? '"Times New Roman", Times, serif' : "Arial, Helvetica, sans-serif";
  const headingStyle = {
    color: accent,
    textTransform: template.uppercaseHeadings ? ("uppercase" as const) : ("none" as const),
    borderBottom: template.headingRule ? `1px solid ${accent}` : "none",
  };

  return (
    <article
      aria-label="Document preview"
      className="mx-auto w-full max-w-[640px] rounded-xl bg-white p-6 text-[13px] leading-relaxed text-[#101820] shadow-card sm:p-10"
      style={{ fontFamily: family }}
    >
      <h3 className="text-2xl font-semibold" style={{ fontFamily: family }}>{doc.name || "Your name"}</h3>
      {doc.headline && <p className="mt-1 text-[15px]" style={{ color: accent }}>{doc.headline}</p>}
      {doc.contact.length > 0 && <p className="mt-1 text-xs text-[#5B6672]">{doc.contact.join("   |   ")}</p>}

      {doc.sections.map((s, i) => (
        <section key={i} className="mt-5">
          {s.heading && (
            <h4 className="pb-1 text-[12px] font-bold tracking-wide" style={headingStyle}>{s.heading}</h4>
          )}
          {(s.entries ?? []).map((e, j) => (
            <div key={j} className="mt-2">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="font-semibold">{e.title}</p>
                {e.dates && <p className="text-xs text-[#5B6672]">{e.dates}</p>}
              </div>
              {e.subtitle && <p className="text-xs text-[#5B6672]">{e.subtitle}</p>}
              {(e.bullets ?? []).length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-5">
                  {(e.bullets ?? []).map((b, k) => <li key={k}>{b}</li>)}
                </ul>
              )}
            </div>
          ))}
          {(s.lines ?? []).map((l, k) => (
            <p key={k} className="mt-1 whitespace-pre-line">{l}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
