// Run with: node --experimental-strip-types tests/tools.test.mts
import assert from "node:assert/strict";
import { calculatePercent, calculateGpa, calculateMarks, calculateAge, parseIsoDate } from "../lib/student.ts";
import { evaluate, ExprError } from "../lib/expr.ts";
import {
  addTodo, toggleTodo, removeTodo, clearCompleted, validatePomodoro, DEFAULT_POMODORO,
  nextPhaseAfterWork, formatClock, phaseSeconds, validateBlock, findOverlaps, totalPlannedMinutes,
  moveCard, addCard, filterNotes, validateApplication, countByStatus, responseRate, timeToMinutes,
  type TimeBlock, type KanbanCard, type Application,
} from "../lib/productivity.ts";

let passed = 0;
const test = (name: string, fn: () => void) => { fn(); passed++; console.log(`ok - ${name}`); };
const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

/* ---- percentage ---- */
test("percent of", () => { const r = calculatePercent("of", 20, 150); assert.ok(r.ok); close(r.value, 30); });
test("is-what-percent", () => { const r = calculatePercent("isWhat", 45, 60); assert.ok(r.ok); close(r.value, 75); });
test("percent change up and down", () => {
  const up = calculatePercent("change", 50, 75); const down = calculatePercent("change", 80, 60);
  assert.ok(up.ok && down.ok); close(up.value, 50); close(down.value, -25);
});
test("percent rejects division by zero", () => {
  assert.equal(calculatePercent("isWhat", 5, 0).ok, false);
  assert.equal(calculatePercent("change", 0, 5).ok, false);
});

/* ---- GPA ---- */
test("gpa weighted average", () => {
  const r = calculateGpa([{ grade: "A", credits: 3 }, { grade: "B", credits: 4 }, { grade: "C+", credits: 2 }]);
  assert.ok(r.ok); close(r.value.gpa, (4 * 3 + 3 * 4 + 2.3 * 2) / 9); assert.equal(r.value.totalCredits, 9);
});
test("gpa rejects bad credits and unknown grade", () => {
  assert.equal(calculateGpa([{ grade: "A", credits: 0 }]).ok, false);
  assert.equal(calculateGpa([{ grade: "Z", credits: 3 }]).ok, false);
  assert.equal(calculateGpa([]).ok, false);
});

/* ---- marks ---- */
test("marks totals and percentage", () => {
  const r = calculateMarks([{ obtained: 40, max: 50 }, { obtained: 70, max: 100 }]);
  assert.ok(r.ok); assert.equal(r.value.totalObtained, 110); assert.equal(r.value.totalMax, 150);
  close(r.value.percentage, (110 / 150) * 100); close(r.value.average, 55);
});
test("marks reject obtained above max and zero max", () => {
  assert.equal(calculateMarks([{ obtained: 60, max: 50 }]).ok, false);
  assert.equal(calculateMarks([{ obtained: 0, max: 0 }]).ok, false);
});

/* ---- age ---- */
test("age calendar difference with borrow", () => {
  const r = calculateAge("2000-05-15", "2026-11-01");
  assert.ok(r.ok); assert.equal(r.value.years, 26); assert.equal(r.value.months, 5); assert.equal(r.value.days, 17);
});
test("age exact birthday", () => {
  const r = calculateAge("1990-03-10", "2026-03-10");
  assert.ok(r.ok); assert.equal(r.value.years, 36); assert.equal(r.value.months, 0); assert.equal(r.value.days, 0);
  assert.equal(r.value.nextBirthdayInDays, 0); // birthday is today
});
test("age rejects future, bad and out-of-range dates", () => {
  assert.equal(calculateAge("2030-01-01", "2026-01-01").ok, false);
  assert.equal(calculateAge("1850-01-01", "2026-01-01").ok, false);
  assert.equal(calculateAge("2000-02-30", "2026-01-01").ok, false);
  assert.equal(calculateAge("15/05/2000", "2026-01-01").ok, false);
});
test("parseIsoDate rejects impossible dates", () => {
  assert.equal(parseIsoDate("2024-02-29") !== null, true);
  assert.equal(parseIsoDate("2025-02-29"), null);
});

/* ---- expression evaluator ---- */
const ev = (s: string, angle: "deg" | "rad" = "deg") => evaluate(s, angle);
test("precedence and parentheses", () => { assert.equal(ev("2+3*4"), 14); assert.equal(ev("(1+2)*3"), 9); });
test("power is right-associative", () => assert.equal(ev("2^3^2"), 512));
test("unary minus binds looser than power", () => assert.equal(ev("-2^2"), -4));
test("division and decimals", () => close(ev("10 / 4"), 2.5));
test("unicode operators", () => assert.equal(ev("6×7 − 2"), 40));
test("trig in degrees and radians", () => {
  close(ev("sin(90)"), 1); close(ev("cos(0)"), 1); close(ev("sin(pi/2)", "rad"), 1);
});
test("inverse trig returns degrees", () => close(ev("asin(1)"), 90));
test("logs, roots, abs", () => { close(ev("log(1000)"), 3); close(ev("ln(e)"), 1); close(ev("sqrt(81)"), 9); assert.equal(ev("abs(-3)"), 3); });
test("factorial", () => { assert.equal(ev("5!"), 120); assert.equal(ev("0!"), 1); });
test("errors are reported as ExprError", () => {
  for (const bad of ["1/0", "2(", "3 +", "", "sqrt(-1)", "ln(0)", "foo(2)", "2 $ 3", "1.5!", "(2", "2 3"]) {
    assert.throws(() => ev(bad), ExprError, `expected error for ${JSON.stringify(bad)}`);
  }
});

/* ---- to-do ---- */
test("todo add trims, ignores blank, toggles, removes, clears", () => {
  let items = addTodo([], "   ", "a", 1);
  assert.equal(items.length, 0);
  items = addTodo(items, "  Read   chapter 3 ", "a", 1);
  items = addTodo(items, "Essay", "b", 2);
  assert.equal(items[0].text, "Essay");
  items = toggleTodo(items, "a");
  assert.equal(items.find((t) => t.id === "a")!.done, true);
  assert.equal(clearCompleted(items).length, 1);
  assert.equal(removeTodo(items, "b").length, 1);
});

/* ---- pomodoro ---- */
test("pomodoro validation and phase sequencing", () => {
  assert.equal(validatePomodoro(DEFAULT_POMODORO), null);
  assert.ok(validatePomodoro({ ...DEFAULT_POMODORO, workMinutes: 0 }));
  assert.ok(validatePomodoro({ ...DEFAULT_POMODORO, cyclesBeforeLongBreak: 2.5 }));
  assert.equal(nextPhaseAfterWork(1, DEFAULT_POMODORO), "shortBreak");
  assert.equal(nextPhaseAfterWork(4, DEFAULT_POMODORO), "longBreak");
  assert.equal(phaseSeconds("work", DEFAULT_POMODORO), 1500);
  assert.equal(formatClock(1500), "25:00");
  assert.equal(formatClock(65), "01:05");
  assert.equal(formatClock(-3), "00:00");
});

/* ---- planner ---- */
test("planner validation", () => {
  assert.equal(validateBlock("", "09:00", "10:00") !== null, true);
  assert.equal(validateBlock("Study", "10:00", "09:00") !== null, true);
  assert.equal(validateBlock("Study", "09:00", "9:00") !== null, true);
  assert.equal(validateBlock("Study", "09:00", "10:30"), null);
  assert.equal(timeToMinutes("23:59"), 1439);
});
test("planner overlaps and totals", () => {
  const blocks: TimeBlock[] = [
    { id: "1", title: "A", start: "09:00", end: "10:00" },
    { id: "2", title: "B", start: "09:30", end: "11:00" },
    { id: "3", title: "C", start: "11:00", end: "12:00" },
  ];
  assert.deepEqual(findOverlaps(blocks), [["1", "2"]]);
  assert.equal(totalPlannedMinutes(blocks), 60 + 90 + 60);
});

/* ---- kanban ---- */
test("kanban moves respect column bounds", () => {
  let cards: KanbanCard[] = addCard([], "Write report", "c1");
  cards = moveCard(cards, "c1", 1);
  assert.equal(cards[0].column, "doing");
  cards = moveCard(cards, "c1", 1);
  cards = moveCard(cards, "c1", 1);
  assert.equal(cards[0].column, "done");
  assert.equal(moveCard(cards, "c1", 1)[0].column, "done");
  assert.equal(addCard([], "   ", "x").length, 0);
});

/* ---- notes ---- */
test("notes search matches all terms, newest first", () => {
  const notes = [
    { id: "1", title: "Physics", body: "Newton laws", updatedAt: 1 },
    { id: "2", title: "Chemistry", body: "Acids and bases", updatedAt: 5 },
    { id: "3", title: "Maths", body: "Newton integrals", updatedAt: 3 },
  ];
  assert.deepEqual(filterNotes(notes, "").map((n) => n.id), ["2", "3", "1"]);
  assert.deepEqual(filterNotes(notes, "newton integrals").map((n) => n.id), ["3"]);
  assert.equal(filterNotes(notes, "zzz").length, 0);
});

/* ---- job tracker ---- */
test("application validation", () => {
  const base = { company: "Acme", role: "Engineer", appliedOn: "2026-10-01", link: "" };
  assert.equal(validateApplication(base), null);
  assert.ok(validateApplication({ ...base, company: "" }));
  assert.ok(validateApplication({ ...base, appliedOn: "01/10/2026" }));
  assert.ok(validateApplication({ ...base, link: "acme.com/jobs" }));
  assert.equal(validateApplication({ ...base, link: "https://acme.com/jobs" }), null);
});
test("application stats", () => {
  const mk = (status: Application["status"]): Application => ({ id: status + Math.random(), company: "x", role: "y", status, appliedOn: "2026-01-01", link: "", notes: "" });
  const apps = [mk("Applied"), mk("Interview"), mk("Offer"), mk("Rejected"), mk("Withdrawn")];
  assert.equal(countByStatus(apps).Applied, 1);
  assert.equal(responseRate(apps), 50); // 2 responded of 4 decided (withdrawn excluded)
  assert.equal(responseRate([]), 0);
});

console.log(`\n${passed} tests passed`);
