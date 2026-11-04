import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { CATEGORY_LABEL, type ToolDef } from "@/lib/tools";
import { ToolIcon } from "@/components/tool-icon";

export function ToolCard({ tool }: { tool: ToolDef }) {

  return (
    <Link
      href={`/tools/${tool.slug}`}
      className="group flex h-full flex-col rounded-2xl border border-ink/10 bg-paper-raised p-5 shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-cobalt/40 hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-paper"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper transition-colors group-hover:bg-cobalt">
          <ToolIcon icon={tool.icon} />
        </span>
        <span className="rounded-full bg-amber-wash px-2.5 py-1 text-xs font-medium text-ink-soft">
          Beta
        </span>
      </div>

      <h3 className="mt-4 text-lg leading-snug text-ink">{tool.name}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-mute">
        {tool.description}
      </p>

      <div className="mt-auto flex items-center justify-between pt-5">
        <span className="text-xs text-ink-mute">
          {CATEGORY_LABEL[tool.category]}
        </span>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-cobalt">
          Open tool
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
