/** Pure calculation logic for student tools. No imports; fully unit tested. */

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = <T>(error: string): Result<T> => ({ ok: false, error });

export function parseNumber(text: string): number | null {
  const t = text.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/* ---------- Percentage ---------- */

export type PercentMode = "of" | "isWhat" | "change";

export function calculatePercent(mode: PercentMode, a: number, b: number): Result<number> {
  switch (mode) {
    case "of":
      // What is a% of b?
      return ok((a * b) / 100);
    case "isWhat":
      // a is what percent of b?
      if (b === 0) return fail("The total cannot be zero.");
      return ok((a / b) * 100);
    case "change":
      // Percentage change from a to b.
      if (a === 0) return fail("The starting value cannot be zero when calculating change.");
      return ok(((b - a) / Math.abs(a)) * 100);
  }
}

/* ---------- GPA ---------- */

export const GRADE_POINTS: Record<string, number> = {
  "A": 4.0, "A-": 3.7,
  "B+": 3.3, "B": 3.0, "B-": 2.7,
  "C+": 2.3, "C": 2.0, "C-": 1.7,
  "D+": 1.3, "D": 1.0,
  "F": 0,
};

export interface GpaEntry {
  grade: string;
  credits: number;
}

export function calculateGpa(entries: GpaEntry[]): Result<{ gpa: number; totalCredits: number }> {
  const valid = entries.filter((e) => e.grade !== "" || e.credits > 0);
  if (valid.length === 0) return fail("Add at least one course with a grade and credits.");

  let weighted = 0;
  let credits = 0;
  for (const e of valid) {
    if (!(e.grade in GRADE_POINTS)) return fail("Choose a grade for every course.");
    if (!Number.isFinite(e.credits) || e.credits <= 0 || e.credits > 30)
      return fail("Credit hours must be a number greater than 0 and up to 30.");
    weighted += GRADE_POINTS[e.grade] * e.credits;
    credits += e.credits;
  }
  return ok({ gpa: weighted / credits, totalCredits: credits });
}

/* ---------- Marks ---------- */

export interface SubjectMark {
  obtained: number;
  max: number;
}

export function calculateMarks(subjects: SubjectMark[]): Result<{
  totalObtained: number;
  totalMax: number;
  percentage: number;
  average: number;
}> {
  if (subjects.length === 0) return fail("Add at least one subject.");
  let obtained = 0;
  let max = 0;
  for (const s of subjects) {
    if (!Number.isFinite(s.max) || s.max <= 0) return fail("Maximum marks must be greater than 0.");
    if (!Number.isFinite(s.obtained) || s.obtained < 0 || s.obtained > s.max)
      return fail("Marks obtained must be between 0 and the maximum for that subject.");
    obtained += s.obtained;
    max += s.max;
  }
  return ok({
    totalObtained: obtained,
    totalMax: max,
    percentage: (obtained / max) * 100,
    average: obtained / subjects.length,
  });
}

/* ---------- Age ---------- */

export interface AgeResult {
  years: number;
  months: number;
  days: number;
  totalDays: number;
  nextBirthdayInDays: number;
}

/** Parses YYYY-MM-DD strictly. Returns null for anything else. */
export function parseIsoDate(text: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text.trim());
  if (!match) return null;
  const y = Number(match[1]);
  const m = Number(match[2]);
  const d = Number(match[3]);
  const check = new Date(Date.UTC(y, m - 1, d));
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return { y, m, d };
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

const DAY_MS = 86_400_000;

export function calculateAge(birthText: string, todayText: string): Result<AgeResult> {
  const birth = parseIsoDate(birthText);
  const today = parseIsoDate(todayText);
  if (!birth) return fail("Enter a valid birth date.");
  if (!today) return fail("Enter a valid date to calculate from.");
  if (birth.y < 1900) return fail("Birth year must be 1900 or later.");

  const birthUtc = Date.UTC(birth.y, birth.m - 1, birth.d);
  const todayUtc = Date.UTC(today.y, today.m - 1, today.d);
  if (birthUtc > todayUtc) return fail("The birth date cannot be in the future.");

  let years = today.y - birth.y;
  let months = today.m - birth.m;
  let days = today.d - birth.d;
  if (days < 0) {
    months -= 1;
    // Borrow the length of the month before the reference date.
    const prevMonth = today.m === 1 ? 12 : today.m - 1;
    const prevYear = today.m === 1 ? today.y - 1 : today.y;
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  // Next birthday: this year if still ahead, otherwise next year.
  let nextYear = today.y;
  let nextBirthday = Date.UTC(nextYear, birth.m - 1, birth.d);
  if (nextBirthday < todayUtc) {
    nextYear += 1;
    nextBirthday = Date.UTC(nextYear, birth.m - 1, birth.d);
  }

  return ok({
    years,
    months,
    days,
    totalDays: Math.round((todayUtc - birthUtc) / DAY_MS),
    nextBirthdayInDays: Math.round((nextBirthday - todayUtc) / DAY_MS),
  });
}
