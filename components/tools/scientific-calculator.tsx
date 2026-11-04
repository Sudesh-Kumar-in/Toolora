"use client";

import { useState, type KeyboardEvent } from "react";
import { evaluate, ExprError, type AngleMode } from "@/lib/expr";
import { CopyButton } from "@/components/tools/shared/copy-button";

const FUNCS = ["sin(", "cos(", "tan(", "asin(", "acos(", "atan(", "ln(", "log(", "sqrt(", "abs("];
const KEYS = ["π", "e", "^", "!", "(", ")", "7", "8", "9", "÷", "4", "5", "6", "×", "1", "2", "3", "−", "0", ".", "+"];

interface HistoryItem { expression: string; result: string }

export default function ScientificCalculator() {
  const [expr, setExpr] = useState("");
  const [angle, setAngle] = useState<AngleMode>("deg");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  function insert(token: string) {
    setExpr((e) => e + token);
    setError(null);
  }

  function calculate() {
    if (!expr.trim()) {
      setError("Enter an expression first.");
      return;
    }
    try {
      const value = evaluate(expr, angle);
      const pretty = Number(value.toPrecision(12)).toString();
      setResult(pretty);
      setError(null);
      setHistory((h) => [{ expression: expr, result: pretty }, ...h].slice(0, 6));
    } catch (err) {
      setResult(null);
      setError(err instanceof ExprError ? err.message : "Something went wrong with that expression.");
    }
  }

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      calculate();
    }
  }

  const btn = "min-h-[44px] rounded-xl bg-paper px-2 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-paper-sunk focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt active:scale-[0.98]";

  return (
    <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
      <div className="space-y-4">
        <div>
          <label htmlFor="sci-expr" className="sr-only">Expression</label>
          <input
            id="sci-expr"
            value={expr}
            onChange={(e) => { setExpr(e.target.value); setError(null); }}
            onKeyDown={onKey}
            placeholder="Type or tap keys, e.g. sin(30) + 2^3"
            autoComplete="off"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby="sci-status"
            className="field min-h-[56px] font-mono text-lg"
          />
          <div id="sci-status" aria-live="polite" className="mt-3 min-h-[3.5rem]">
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            {result !== null && !error && (
              <p className="font-display text-4xl text-ink">= {result}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          <button type="button" className={btn} onClick={() => setAngle((a) => (a === "deg" ? "rad" : "deg"))} aria-label={`Angle mode ${angle}, switch`}>
            {angle.toUpperCase()}
          </button>
          {FUNCS.map((f) => (
            <button key={f} type="button" className={btn} onClick={() => insert(f)}>{f.slice(0, -1)}</button>
          ))}
          {KEYS.map((k) => (
            <button key={k} type="button" className={btn} onClick={() => insert(k)}>{k}</button>
          ))}
          <button type="button" className={`${btn} text-cobalt`} onClick={() => { setExpr((e) => e.slice(0, -1)); setError(null); }} aria-label="Backspace">⌫</button>
          <button type="button" className={btn} onClick={() => { setExpr(""); setResult(null); setError(null); }}>AC</button>
          <button type="button" className={`${btn} bg-ink text-paper-raised hover:bg-cobalt hover:text-paper-raised`} onClick={calculate}>=</button>
        </div>
        <p className="text-xs text-ink-mute">
          Angles are in {angle === "deg" ? "degrees" : "radians"}. Tap {angle.toUpperCase()} to switch. You can also type on a keyboard; press Enter to calculate.
        </p>
      </div>

      <aside className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        <div className="flex items-center justify-between">
          <h3 className="text-lg">History</h3>
          {history.length > 0 && (
            <button type="button" className="text-sm text-ink-mute hover:text-ink" onClick={() => setHistory([])}>Clear</button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="mt-3 text-sm text-ink-mute">Your last six calculations appear here.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {history.map((h, i) => (
              <li key={i} className="rounded-xl bg-paper p-3">
                <button type="button" onClick={() => { setExpr(h.expression); setResult(null); setError(null); }} className="block w-full text-left">
                  <span className="block truncate font-mono text-xs text-ink-mute">{h.expression}</span>
                  <span className="block font-mono text-base text-ink">= {h.result}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {result !== null && <div className="mt-5"><CopyButton text={result} label="Copy result" /></div>}
      </aside>
    </div>
  );
}
