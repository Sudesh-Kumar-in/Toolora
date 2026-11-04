/** Date helpers that avoid timezone surprises. No imports. */

/** Formats a Date as YYYY-MM-DD using its local calendar fields. */
export function isoDateOf(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
