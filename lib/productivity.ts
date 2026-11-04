/** Pure state logic for productivity tools. No imports; fully unit tested. */

/* ---------- To-do ---------- */

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
}

export function addTodo(items: TodoItem[], text: string, id: string, now: number): TodoItem[] {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return items;
  return [{ id, text: clean.slice(0, 200), done: false, createdAt: now }, ...items];
}

export function toggleTodo(items: TodoItem[], id: string): TodoItem[] {
  return items.map((t) => (t.id === id ? { ...t, done: !t.done } : t));
}

export function removeTodo(items: TodoItem[], id: string): TodoItem[] {
  return items.filter((t) => t.id !== id);
}

export function clearCompleted(items: TodoItem[]): TodoItem[] {
  return items.filter((t) => !t.done);
}

/* ---------- Pomodoro ---------- */

export type PomodoroPhase = "work" | "shortBreak" | "longBreak";

export interface PomodoroSettings {
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  cyclesBeforeLongBreak: number;
}

export const DEFAULT_POMODORO: PomodoroSettings = {
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  cyclesBeforeLongBreak: 4,
};

export function validatePomodoro(s: PomodoroSettings): string | null {
  const within = (n: number, min: number, max: number) => Number.isInteger(n) && n >= min && n <= max;
  if (!within(s.workMinutes, 1, 120)) return "Work time must be a whole number of minutes from 1 to 120.";
  if (!within(s.shortBreakMinutes, 1, 60)) return "Short break must be a whole number from 1 to 60.";
  if (!within(s.longBreakMinutes, 1, 60)) return "Long break must be a whole number from 1 to 60.";
  if (!within(s.cyclesBeforeLongBreak, 1, 10)) return "Cycles before a long break must be from 1 to 10.";
  return null;
}

export function phaseSeconds(phase: PomodoroPhase, s: PomodoroSettings): number {
  const minutes =
    phase === "work" ? s.workMinutes : phase === "shortBreak" ? s.shortBreakMinutes : s.longBreakMinutes;
  return minutes * 60;
}

/** Which phase follows a finished work session. `completedWork` includes the one just finished. */
export function nextPhaseAfterWork(completedWork: number, s: PomodoroSettings): PomodoroPhase {
  return completedWork % s.cyclesBeforeLongBreak === 0 ? "longBreak" : "shortBreak";
}

export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- Daily planner ---------- */

export interface TimeBlock {
  id: string;
  title: string;
  start: string; // HH:MM, 24-hour
  end: string;   // HH:MM, 24-hour
}

export function timeToMinutes(hhmm: string): number | null {
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export function validateBlock(title: string, start: string, end: string): string | null {
  if (!title.trim()) return "Give the block a title.";
  const s = timeToMinutes(start);
  const e = timeToMinutes(end);
  if (s === null || e === null) return "Choose a start and end time.";
  if (e <= s) return "The end time must be after the start time.";
  return null;
}

export function sortBlocks(blocks: TimeBlock[]): TimeBlock[] {
  return [...blocks].sort((a, b) => (timeToMinutes(a.start) ?? 0) - (timeToMinutes(b.start) ?? 0));
}

/** Returns pairs of block ids that overlap in time. */
export function findOverlaps(blocks: TimeBlock[]): [string, string][] {
  const sorted = sortBlocks(blocks);
  const pairs: [string, string][] = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const aEnd = timeToMinutes(a.end) ?? 0;
      const bStart = timeToMinutes(b.start) ?? 0;
      if (bStart < aEnd) pairs.push([a.id, b.id]);
    }
  }
  return pairs;
}

export function totalPlannedMinutes(blocks: TimeBlock[]): number {
  return blocks.reduce((sum, b) => {
    const s = timeToMinutes(b.start) ?? 0;
    const e = timeToMinutes(b.end) ?? 0;
    return sum + Math.max(0, e - s);
  }, 0);
}

/* ---------- Kanban ---------- */

export type KanbanColumn = "todo" | "doing" | "done";
export const KANBAN_COLUMNS: KanbanColumn[] = ["todo", "doing", "done"];

export interface KanbanCard {
  id: string;
  title: string;
  column: KanbanColumn;
}

export function moveCard(cards: KanbanCard[], id: string, direction: -1 | 1): KanbanCard[] {
  return cards.map((card) => {
    if (card.id !== id) return card;
    const index = KANBAN_COLUMNS.indexOf(card.column) + direction;
    if (index < 0 || index >= KANBAN_COLUMNS.length) return card;
    return { ...card, column: KANBAN_COLUMNS[index] };
  });
}

export function addCard(cards: KanbanCard[], title: string, id: string): KanbanCard[] {
  const clean = title.trim();
  if (!clean) return cards;
  return [...cards, { id, title: clean.slice(0, 200), column: "todo" }];
}

/* ---------- Notes ---------- */

export interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: number;
}

export function filterNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  const list = [...notes].sort((a, b) => b.updatedAt - a.updatedAt);
  if (!q) return list;
  const terms = q.split(/\s+/);
  return list.filter((n) => {
    const hay = `${n.title} ${n.body}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  });
}

/* ---------- Job application tracker ---------- */

export const APPLICATION_STATUSES = ["Applied", "Interview", "Offer", "Rejected", "Withdrawn"] as const;
export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export interface Application {
  id: string;
  company: string;
  role: string;
  status: ApplicationStatus;
  appliedOn: string; // YYYY-MM-DD
  link: string;
  notes: string;
}

export function validateApplication(a: { company: string; role: string; appliedOn: string; link: string }): string | null {
  if (!a.company.trim()) return "Enter the company name.";
  if (!a.role.trim()) return "Enter the job title.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.appliedOn)) return "Choose the date you applied.";
  if (a.link.trim() && !/^https?:\/\//i.test(a.link.trim())) return "The link must start with http:// or https://.";
  return null;
}

export function countByStatus(apps: Application[]): Record<ApplicationStatus, number> {
  const counts = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
  for (const a of apps) counts[a.status] += 1;
  return counts;
}

/** Share of applications that reached an interview or offer, as a whole percentage. */
export function responseRate(apps: Application[]): number {
  const decided = apps.filter((a) => a.status !== "Withdrawn");
  if (decided.length === 0) return 0;
  const responded = decided.filter((a) => a.status === "Interview" || a.status === "Offer").length;
  return Math.round((responded / decided.length) * 100);
}

/**
 * RFC 4180 CSV. Every field is quoted and embedded quotes are doubled.
 * Cells beginning with = + - @ get a leading apostrophe so spreadsheets
 * do not run them as formulas.
 */
export function toCsv(apps: Application[]): string {
  const header = ["Company", "Role", "Status", "Applied on", "Link", "Notes"];
  const cell = (v: string) => {
    const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
    return `"${safe.replace(/"/g, '""')}"`;
  };
  const rows = apps.map((a) =>
    [a.company, a.role, a.status, a.appliedOn, a.link, a.notes].map(cell).join(","),
  );
  return [header.map(cell).join(","), ...rows].join("\r\n");
}
