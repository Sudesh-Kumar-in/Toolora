import Link from "next/link";
import { ShieldCheck, Gauge, Award } from "lucide-react";
import { ToolDirectory } from "@/components/tool-directory";
import { ToolCard } from "@/components/tool-card";
import { getPopularTools, getRecentTools, TOOLS } from "@/lib/tools";

const FEATURES = [
  {
    icon: Gauge,
    title: "Fast processing",
    body: "Tools run the moment you drop a file in. No queues, no waiting for a server to finish.",
  },
  {
    icon: Award,
    title: "Premium quality",
    body: "Compression and conversion keep fine detail and text crisp, so results look right the first time.",
  },
  {
    icon: ShieldCheck,
    title: "Privacy first",
    body: "Where a tool can work in your browser, your files never leave your device. Nothing is kept after you close the tab.",
  },
];

const FAQS = [
  {
    q: "Do I need to create an account?",
    a: "No. Every tool is free to use without signing up.",
  },
  {
    q: "Are my files uploaded to a server?",
    a: "Where a tool supports it, files are processed entirely in your browser. Each tool page states clearly how its files are handled.",
  },
  {
    q: "Is there a limit on how many times I can use a tool?",
    a: "You can use any ready tool as often as you need.",
  },
  {
    q: "Which tools are available now?",
    a: "Tools marked “Beta” work today and are still being tested. Tools marked “Coming soon” are on the roadmap and will open once they are built.",
  },
];

export default function HomePage() {
  const availableCount = TOOLS.filter((t) => t.status !== "planned").length;

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pb-12 pt-16 sm:px-8 sm:pt-24">
        <p className="animate-rise text-sm text-ink-mute">
          {TOOLS.length} tools · {availableCount} available now
        </p>
        <h1 className="animate-rise mt-4 max-w-4xl text-5xl leading-[1.05] sm:text-7xl [animation-delay:60ms]">
          All your tools. One powerful workspace.
        </h1>
        <p className="animate-rise mt-6 max-w-2xl text-lg leading-relaxed text-ink-soft [animation-delay:120ms]">
          Compress photos, merge PDFs, build a résumé, check your CGPA and
          plan your day, without switching between a dozen websites.
        </p>
      </section>

      <ToolDirectory />

      <section
        id="popular"
        aria-labelledby="popular-heading"
        className="scroll-mt-24 mx-auto mt-24 max-w-6xl px-5 sm:px-8"
      >
        <div className="flex items-end justify-between gap-4">
          <h2 id="popular-heading" className="text-3xl">
            Popular tools
          </h2>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {getPopularTools(4).map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="recent-heading"
        className="mx-auto mt-24 max-w-6xl px-5 sm:px-8"
      >
        <h2 id="recent-heading" className="text-3xl">
          Recently added
        </h2>
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {getRecentTools(4).map((tool) => (
            <li key={tool.slug}>
              <ToolCard tool={tool} />
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-labelledby="why-heading"
        className="mx-auto mt-24 max-w-6xl px-5 sm:px-8"
      >
        <div className="grid gap-10 rounded-3xl border border-ink/10 bg-paper-raised p-8 shadow-card sm:p-12 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 id="why-heading" className="text-3xl sm:text-4xl">
              Why choose Toolora?
            </h2>
            <p className="mt-4 leading-relaxed text-ink-mute">
              We built the tools people reach for every week, then made them
              quick to find, simple to use and careful with your files.
            </p>
            <Link href="/about" className="btn-secondary mt-8">
              About Toolora
            </Link>
          </div>
          <ul className="grid gap-6 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex flex-col gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-cobalt-wash text-cobalt">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="text-xl">{f.title}</h3>
                <p className="text-sm leading-relaxed text-ink-mute">{f.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="faq"
        aria-labelledby="faq-heading"
        className="scroll-mt-24 mx-auto mt-24 max-w-3xl px-5 sm:px-8"
      >
        <h2 id="faq-heading" className="text-3xl">
          Frequently asked questions
        </h2>
        <div className="mt-6 divide-y divide-ink/10 border-y border-ink/10">
          {FAQS.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-medium text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded">
                {item.q}
                <span
                  aria-hidden="true"
                  className="text-xl text-ink-mute transition-transform duration-200 group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <p className="mt-3 pr-8 leading-relaxed text-ink-mute">{item.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
