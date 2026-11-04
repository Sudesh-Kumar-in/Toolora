"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Copies text to the clipboard and confirms, or reports failure clearly. */
export function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1800);
    return () => clearTimeout(t);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("failed");
    }
  }

  return (
    <button type="button" onClick={copy} disabled={!text} className="btn-secondary">
      {state === "copied" ? <Check className="h-4 w-4 text-cobalt" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
      {state === "copied" ? "Copied" : state === "failed" ? "Copy failed" : label}
    </button>
  );
}
