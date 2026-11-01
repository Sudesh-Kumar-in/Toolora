import type { ReactNode } from "react";

/** Shared layout for About, Contact, Privacy and Terms pages. */
export function PageShell({
  title,
  intro,
  meta,
  children,
}: {
  title: string;
  intro?: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-14 sm:px-8 sm:pt-20">
      <header>
        <h1 className="text-4xl leading-tight sm:text-5xl">{title}</h1>
        {intro && <p className="mt-5 text-lg leading-relaxed text-ink-soft">{intro}</p>}
        {meta && <p className="mt-4 text-sm text-ink-mute">{meta}</p>}
      </header>
      <div className="mt-12 space-y-5 leading-relaxed text-ink-soft [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:text-ink [&_h3]:mt-8 [&_h3]:text-lg [&_h3]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_a]:text-cobalt [&_a]:underline [&_a]:underline-offset-4">
        {children}
      </div>
    </div>
  );
}
