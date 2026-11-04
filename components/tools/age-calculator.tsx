"use client";

import { useEffect, useMemo, useState } from "react";
import { calculateAge } from "@/lib/student";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { isoDateOf } from "@/lib/dates";

export default function AgeCalculator() {
  const [birth, setBirth] = useState("");
  // Set after mount so server and client render the same markup regardless of timezone.
  const [asOf, setAsOf] = useState("");
  useEffect(() => { setAsOf(isoDateOf(new Date())); }, []);

  const result = useMemo(() => {
    if (!birth) return { ok: false as const, error: "Choose a birth date to see the age." };
    if (!asOf) return { ok: false as const, error: "Loading today's date…" };
    return calculateAge(birth, asOf);
  }, [birth, asOf]);

  const summary = result.ok
    ? `${result.value.years} years, ${result.value.months} months, ${result.value.days} days (as of ${asOf})`
    : "";

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <div>
          <label htmlFor="age-birth" className="text-sm font-medium text-ink">Date of birth</label>
          <input id="age-birth" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} max={asOf} className="field mt-2" />
        </div>
        <div>
          <label htmlFor="age-asof" className="text-sm font-medium text-ink">Calculate age as of</label>
          <input id="age-asof" type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} className="field mt-2" />
          <p className="mt-2 text-xs text-ink-mute">Defaults to today. Change it to see someone&apos;s age on another date.</p>
        </div>
        <button type="button" className="btn-secondary" onClick={() => { setBirth(""); setAsOf(isoDateOf(new Date())); }}>Reset</button>
      </div>

      <aside aria-live="polite" className="h-fit rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        {result.ok ? (
          <>
            <p className="font-display text-5xl text-ink">
              {result.value.years} <span className="text-2xl text-ink-mute">years</span> {result.value.months} <span className="text-2xl text-ink-mute">months</span> {result.value.days} <span className="text-2xl text-ink-mute">days</span>
            </p>
            <dl className="mt-6 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-paper p-3"><dt className="text-ink-mute">Total days lived</dt><dd className="font-semibold">{result.value.totalDays.toLocaleString()}</dd></div>
              <div className="rounded-xl bg-paper p-3"><dt className="text-ink-mute">Next birthday</dt><dd className="font-semibold">{result.value.nextBirthdayInDays === 0 ? "Today" : `In ${result.value.nextBirthdayInDays} days`}</dd></div>
            </dl>
            <div className="mt-5"><CopyButton text={summary} label="Copy age" /></div>
          </>
        ) : (
          <p role={birth ? "alert" : undefined} className="text-sm text-ink-mute">{result.error}</p>
        )}
      </aside>
    </div>
  );
}
