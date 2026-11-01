"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { CATEGORIES, searchTools, type CategoryId } from "@/lib/tools";
import { ToolCard } from "@/components/tool-card";

export function ToolDirectory() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId | "all">("all");

  const results = useMemo(
    () => searchTools(query, category),
    [query, category],
  );

  const hasQuery = query.trim().length > 0;

  return (
    <section id="tools" aria-labelledby="tools-heading" className="scroll-mt-24">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <div className="rounded-3xl border border-ink/10 bg-paper-raised p-3 shadow-card sm:p-4">
          <label htmlFor="tool-search" className="sr-only">
            Search tools
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-mute"
              aria-hidden="true"
            />
            <input
              id="tool-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tools, for example “compress” or “CGPA”"
              className="h-14 w-full rounded-2xl bg-paper pl-12 pr-12 text-base text-ink placeholder:text-ink-mute focus:outline-none focus:ring-2 focus:ring-cobalt/40 [&::-webkit-search-cancel-button]:appearance-none"
              autoComplete="off"
            />
            {hasQuery && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-ink-mute transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            role="group"
            aria-label="Filter by category"
            className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {CATEGORIES.map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setCategory(c.id)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt ${
                    active
                      ? "bg-ink text-paper-raised"
                      : "bg-paper text-ink-soft hover:bg-paper-sunk hover:text-ink"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 flex items-end justify-between gap-4">
          <h2 id="tools-heading" className="text-2xl sm:text-3xl">
            {category === "all"
              ? "Every tool"
              : CATEGORIES.find((c) => c.id === category)?.label}
          </h2>
          <p className="text-sm text-ink-mute" aria-live="polite">
            {results.length} {results.length === 1 ? "tool" : "tools"}
          </p>
        </div>

        {results.length > 0 ? (
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((tool) => (
              <li key={tool.slug} className="animate-rise">
                <ToolCard tool={tool} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-ink/20 p-10 text-center">
            <p className="text-lg text-ink">
              No tools match “{query.trim()}”.
            </p>
            <p className="mt-2 text-sm text-ink-mute">
              Try a shorter word, or clear the search to see every tool.
            </p>
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setCategory("all");
              }}
              className="btn-secondary mt-5"
            >
              Show all tools
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
