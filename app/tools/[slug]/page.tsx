import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import {
  CATEGORY_LABEL,
  getRelatedTools,
  getTool,
  TOOLS,
} from "@/lib/tools";
import { ToolIcon } from "@/components/tool-icon";
import { ToolCard } from "@/components/tool-card";
import { TOOL_COMPONENTS } from "@/components/tools";

type Props = { params: { slug: string } };

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const tool = getTool(params.slug);
  if (!tool) return { title: "Tool not found" };
  return {
    title: tool.name,
    description: tool.description,
    alternates: { canonical: `/tools/${tool.slug}` },
  };
}

const HOW_IT_WORKS = [
  "Use the tool above. Results update as you change the inputs.",
  "Check the output, then copy it or download it where the tool offers that option.",
  "Nothing is kept after you close the page unless the tool says otherwise.",
];

const FAQS = [
  {
    q: "Is this tool free?",
    a: "Yes. There is no account, no paywall and no usage limit.",
  },
  {
    q: "Is my data safe?",
    a: "Tools run in your browser wherever possible, so the data you enter stays on your device. Each tool notes if it ever needs to send data elsewhere.",
  },
  {
    q: "Does it work on my phone?",
    a: "Yes. Every layout is designed for small screens as well as desktops.",
  },
];

export default function ToolPage({ params }: Props) {
  const tool = getTool(params.slug);
  if (!tool) notFound();

  const Component = TOOL_COMPONENTS[tool.slug];
  if (!Component) notFound();
  const related = getRelatedTools(tool.slug, 3);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-20 pt-10 sm:px-8 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-mute">
        <Link href="/#tools" className="inline-flex items-center gap-1.5 rounded hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          All tools
        </Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span>{CATEGORY_LABEL[tool.category]}</span>
      </nav>

      <header className="mt-6 flex items-start gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-ink text-paper">
          <ToolIcon icon={tool.icon} className="h-6 w-6" />
        </span>
        <div>
          <h1 className="text-4xl sm:text-5xl">{tool.name}</h1>
          <p className="mt-3 max-w-2xl text-lg leading-relaxed text-ink-soft">
            {tool.description}
          </p>
        </div>
      </header>

      <section aria-label={`${tool.name} tool`} className="mt-10 rounded-3xl border border-ink/10 bg-paper p-5 sm:p-8">
        <Component />
      </section>

      <div className="mt-14 grid gap-12 lg:grid-cols-[1fr_1fr]">
        <section aria-labelledby="how-heading">
          <h2 id="how-heading" className="text-2xl">How to use it</h2>
          <ol className="mt-5 space-y-4">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step} className="flex gap-4 text-ink-soft">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cobalt-wash text-sm font-semibold text-cobalt">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-start gap-3 rounded-2xl bg-paper-raised p-4 text-sm leading-relaxed text-ink-soft">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-cobalt" aria-hidden="true" />
            Privacy is part of the design. Your files and inputs are handled on
            your device wherever the tool allows.
          </p>
        </section>

        <section aria-labelledby="tool-faq-heading">
          <h2 id="tool-faq-heading" className="text-2xl">Questions</h2>
          <div className="mt-5 divide-y divide-ink/10 border-y border-ink/10">
            {FAQS.map((item) => (
              <details key={item.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded">
                  {item.q}
                  <span aria-hidden="true" className="text-xl text-ink-mute transition-transform duration-200 group-open:rotate-45">+</span>
                </summary>
                <p className="mt-2 leading-relaxed text-ink-mute">{item.a}</p>
              </details>
            ))}
          </div>
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="related-heading" className="mt-20">
          <h2 id="related-heading" className="text-2xl">Related tools</h2>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((t) => (
              <li key={t.slug}>
                <ToolCard tool={t} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
