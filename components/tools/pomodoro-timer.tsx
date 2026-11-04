"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { useLocalStorage } from "@/lib/use-local-storage";
import {
  DEFAULT_POMODORO, formatClock, nextPhaseAfterWork, phaseSeconds, validatePomodoro,
  type PomodoroPhase, type PomodoroSettings,
} from "@/lib/productivity";

const PHASE_LABEL: Record<PomodoroPhase, string> = {
  work: "Focus",
  shortBreak: "Short break",
  longBreak: "Long break",
};

export default function PomodoroTimer() {
  const { value: settings, setValue: setSettings } = useLocalStorage<PomodoroSettings>("toolora:pomodoro", DEFAULT_POMODORO);
  const [draft, setDraft] = useState<PomodoroSettings>(settings);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const [phase, setPhase] = useState<PomodoroPhase>("work");
  const [running, setRunning] = useState(false);
  const [endAt, setEndAt] = useState<number | null>(null);
  const [pausedRemaining, setPausedRemaining] = useState<number>(phaseSeconds("work", DEFAULT_POMODORO));
  const [now, setNow] = useState(() => Date.now());
  const [completedWork, setCompletedWork] = useState(0);

  const remaining = running && endAt !== null ? Math.max(0, Math.ceil((endAt - now) / 1000)) : pausedRemaining;

  // Tick while running. Using timestamps keeps the clock accurate even if the tab is throttled.
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [running]);

  // Phase change when the countdown reaches zero.
  useEffect(() => {
    if (!running || remaining > 0) return;
    setRunning(false);
    setEndAt(null);
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
    if (phase === "work") {
      const done = completedWork + 1;
      setCompletedWork(done);
      const next = nextPhaseAfterWork(done, settings);
      setPhase(next);
      setPausedRemaining(phaseSeconds(next, settings));
    } else {
      setPhase("work");
      setPausedRemaining(phaseSeconds("work", settings));
    }
  }, [running, remaining, phase, completedWork, settings]);

  // Keep the idle countdown in step with saved settings (e.g. after load or Save).
  useEffect(() => {
    if (!running) setPausedRemaining(phaseSeconds(phase, settings));
    // Only react to settings changes; phase changes are handled where they happen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings]);

  // Show the countdown in the browser tab title.
  useEffect(() => {
    document.title = running ? `${formatClock(remaining)} · ${PHASE_LABEL[phase]} · Toolora` : "Pomodoro · Toolora";
  }, [remaining, running, phase]);

  function start() {
    setEndAt(Date.now() + pausedRemaining * 1000);
    setNow(Date.now());
    setRunning(true);
  }

  function pause() {
    setPausedRemaining(remaining);
    setEndAt(null);
    setRunning(false);
  }

  function skip() {
    setRunning(false);
    setEndAt(null);
    if (phase === "work") {
      const next = nextPhaseAfterWork(completedWork + 1, settings);
      setCompletedWork((c) => c + 1);
      setPhase(next);
      setPausedRemaining(phaseSeconds(next, settings));
    } else {
      setPhase("work");
      setPausedRemaining(phaseSeconds("work", settings));
    }
  }

  function reset() {
    setRunning(false);
    setEndAt(null);
    setPhase("work");
    setCompletedWork(0);
    setPausedRemaining(phaseSeconds("work", settings));
  }

  function saveSettings() {
    const problem = validatePomodoro(draft);
    if (problem) return setSettingsError(problem);
    setSettingsError(null);
    setSettings(draft);
    if (!running) {
      setPhase("work");
      setPausedRemaining(phaseSeconds("work", draft));
    }
  }

  const total = useMemo(() => phaseSeconds(phase, settings), [phase, settings]);
  const progress = total === 0 ? 0 : 1 - remaining / total;

  return (
    <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
      <div className="flex flex-col items-center rounded-3xl border border-ink/10 bg-paper-raised p-8 shadow-card">
        <p className="text-sm font-medium text-cobalt" aria-live="polite">{PHASE_LABEL[phase]}</p>
        <p className="mt-2 font-mono text-7xl tabular-nums text-ink sm:text-8xl" role="timer" aria-label={`${formatClock(remaining)} remaining`}>
          {formatClock(remaining)}
        </p>
        <div className="mt-6 h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-paper-sunk" aria-hidden="true">
          <div className="h-full rounded-full bg-cobalt transition-[width] duration-300" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {running ? (
            <button type="button" onClick={pause} className="btn-primary"><Pause className="h-4 w-4" aria-hidden="true" />Pause</button>
          ) : (
            <button type="button" onClick={start} className="btn-primary"><Play className="h-4 w-4" aria-hidden="true" />{pausedRemaining === total && phase === "work" && completedWork === 0 ? "Start focus" : "Resume"}</button>
          )}
          <button type="button" onClick={skip} className="btn-secondary">Skip</button>
          <button type="button" onClick={reset} className="btn-secondary"><RotateCcw className="h-4 w-4" aria-hidden="true" />Reset</button>
        </div>
        <p className="mt-6 text-sm text-ink-mute">Completed focus sessions: <span className="font-semibold text-ink">{completedWork}</span></p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); saveSettings(); }} className="h-fit space-y-4 rounded-3xl border border-ink/10 bg-paper-raised p-6 shadow-card">
        <h3 className="text-lg">Durations</h3>
        {([
          ["workMinutes", "Focus (minutes)"],
          ["shortBreakMinutes", "Short break (minutes)"],
          ["longBreakMinutes", "Long break (minutes)"],
          ["cyclesBeforeLongBreak", "Focus sessions before a long break"],
        ] as const).map(([key, label]) => (
          <div key={key}>
            <label htmlFor={`pom-${key}`} className="text-sm font-medium text-ink">{label}</label>
            <input id={`pom-${key}`} type="number" inputMode="numeric" min={1} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} className="field mt-2" />
          </div>
        ))}
        {settingsError && <p role="alert" className="text-sm text-red-700">{settingsError}</p>}
        <div className="flex flex-wrap gap-3 pt-2">
          <button type="submit" className="btn-primary">Save durations</button>
          <button type="button" className="btn-secondary" onClick={() => { setDraft(DEFAULT_POMODORO); setSettings(DEFAULT_POMODORO); setSettingsError(null); }}>Restore defaults</button>
        </div>
      </form>
    </div>
  );
}
