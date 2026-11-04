"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

export function countText(text: string) {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const characters = text.length;
  const charactersNoSpaces = text.replace(/\s/g, "").length;
  const sentences = trimmed
    ? (trimmed.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).filter(
        (s) => s.trim().length > 0,
      ).length
    : 0;
  const paragraphs = trimmed
    ? trimmed.split(/\n\s*\n/).filter((p) => p.trim().length > 0).length
    : 0;
  const readingMinutes = words / 200; // average adult silent reading speed
  return { words, characters, charactersNoSpaces, sentences, paragraphs, readingMinutes };
}

export default function WordCounter() {
  const [text, setText] = useState("");
  const stats = useMemo(() => countText(text), [text]);

  const items = [
    { label: "Words", value: stats.words.toLocaleString() },
    { label: "Characters", value: stats.characters.toLocaleString() },
    { label: "Characters (no spaces)", value: stats.charactersNoSpaces.toLocaleString() },
    { label: "Sentences", value: stats.sentences.toLocaleString() },
    { label: "Paragraphs", value: stats.paragraphs.toLocaleString() },
    {
      label: "Reading time",
      value:
        stats.words === 0
          ? "0 min"
          : stats.readingMinutes < 1
            ? "Under 1 min"
            : `${Math.ceil(stats.readingMinutes)} min`,
    },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col">
        <label htmlFor="wc-text" className="text-sm font-medium text-ink">
          Your text
        </label>
        <textarea
          id="wc-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste or type your text here. Counts update as you type."
          className="field mt-2 min-h-[320px] resize-y leading-relaxed"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => setText("")}
            disabled={!text}
            className="btn-secondary"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear text
          </button>
        </div>
      </div>

      <dl aria-live="polite" className="grid grid-cols-2 gap-3 self-start">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-card"
          >
            <dt className="text-xs text-ink-mute">{item.label}</dt>
            <dd className="mt-1 font-display text-2xl text-ink">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
