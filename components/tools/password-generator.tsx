"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";

const SETS = {
  upper: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lower: "abcdefghijklmnopqrstuvwxyz",
  digits: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
} as const;

type SetKey = keyof typeof SETS;

/** Uniform random integer in [0, max) using rejection sampling (no modulo bias). */
function randomInt(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buf);
    value = buf[0];
  } while (value >= limit);
  return value % max;
}

function generate(length: number, enabled: SetKey[]): string {
  const pool = enabled.map((k) => SETS[k]).join("");
  // Guarantee at least one character from each selected set.
  const chars: string[] = enabled.map((k) => {
    const set = SETS[k];
    return set[randomInt(set.length)];
  });
  while (chars.length < length) {
    chars.push(pool[randomInt(pool.length)]);
  }
  // Fisher–Yates shuffle so the guaranteed characters are not always first.
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join("");
}

function strengthOf(length: number, poolSize: number) {
  const bits = poolSize > 1 ? length * Math.log2(poolSize) : 0;
  if (bits < 40) return { label: "Weak", bits, tone: "bg-red-600", width: "25%" };
  if (bits < 60) return { label: "Fair", bits, tone: "bg-amber", width: "50%" };
  if (bits < 80) return { label: "Strong", bits, tone: "bg-cobalt", width: "75%" };
  return { label: "Very strong", bits, tone: "bg-ink", width: "100%" };
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [enabled, setEnabled] = useState<Record<SetKey, boolean>>({
    upper: true,
    lower: true,
    digits: true,
    symbols: true,
  });
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeKeys = (Object.keys(enabled) as SetKey[]).filter((k) => enabled[k]);
  const poolSize = activeKeys.reduce((sum, k) => sum + SETS[k].length, 0);

  const regenerate = useCallback(() => {
    if (activeKeys.length === 0) {
      setError("Choose at least one character type.");
      setPassword("");
      return;
    }
    if (length < activeKeys.length) {
      setError(`Length must be at least ${activeKeys.length} to include every selected type.`);
      setPassword("");
      return;
    }
    setError(null);
    setPassword(generate(length, activeKeys));
    setCopied(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [length, enabled]);

  useEffect(() => {
    regenerate();
  }, [regenerate]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("Copy failed. Select the password and copy it manually.");
    }
  }

  const strength = strengthOf(length, poolSize);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-3 rounded-2xl bg-paper p-4">
          <output
            aria-live="polite"
            className="min-w-0 flex-1 break-all font-mono text-lg text-ink"
          >
            {password || "—"}
          </output>
          <button
            type="button"
            onClick={copy}
            disabled={!password}
            className="btn-secondary shrink-0 !px-3.5"
            aria-label="Copy password"
          >
            {copied ? (
              <Check className="h-4 w-4 text-cobalt" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-ink">Strength: {strength.label}</span>
            <span className="text-ink-mute">~{Math.round(strength.bits)} bits</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper-sunk" role="meter" aria-label="Password strength" aria-valuemin={0} aria-valuemax={128} aria-valuenow={Math.round(strength.bits)}>
            <div className={`h-full rounded-full transition-all duration-300 ${strength.tone}`} style={{ width: strength.width }} />
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <label htmlFor="pw-length" className="text-sm font-medium text-ink">
              Length
            </label>
            <span className="font-mono text-sm text-ink">{length}</span>
          </div>
          <input
            id="pw-length"
            type="range"
            min={8}
            max={64}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
            className="mt-3 w-full accent-cobalt"
          />
        </div>

        <fieldset className="mt-6">
          <legend className="text-sm font-medium text-ink">Include</legend>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {(Object.keys(SETS) as SetKey[]).map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-ink/10 px-3.5 py-3 text-sm text-ink transition-colors hover:border-ink/25 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-cobalt"
              >
                <input
                  type="checkbox"
                  checked={enabled[key]}
                  onChange={(e) => setEnabled((prev) => ({ ...prev, [key]: e.target.checked }))}
                  className="h-4 w-4 accent-cobalt"
                />
                {key === "upper" && "Uppercase (A–Z)"}
                {key === "lower" && "Lowercase (a–z)"}
                {key === "digits" && "Numbers (0–9)"}
                {key === "symbols" && "Symbols (!@#…)"}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={regenerate} className="btn-primary mt-8 w-full">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Generate new password
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-ink-mute">
        Generated in your browser with secure random numbers. Nothing is sent to
        a server or stored.
      </p>
    </div>
  );
}
