/** Parses input such as "1-3, 5, 7-9" into 1-based inclusive page ranges. */

export interface PageRange {
  start: number;
  end: number;
}

export type ParseResult = { ranges: PageRange[] } | { error: string };

export function parsePageRanges(input: string, pageCount: number): ParseResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { error: "Enter at least one page or range, for example 1-3, 5." };
  }

  const ranges: PageRange[] = [];
  for (const rawPart of trimmed.split(",")) {
    const part = rawPart.trim();
    if (!part) {
      return { error: "Remove the extra comma. Separate ranges with a single comma." };
    }

    const match = /^(\d+)(?:\s*-\s*(\d+))?$/.exec(part);
    if (!match) {
      return { error: `"${part}" is not a valid page or range. Use formats like 4 or 2-6.` };
    }

    const start = Number(match[1]);
    const end = match[2] !== undefined ? Number(match[2]) : start;

    if (start > end) {
      return { error: `"${part}" starts after it ends. Write the smaller number first.` };
    }
    if (start < 1 || end > pageCount) {
      return { error: `Pages must be between 1 and ${pageCount}. "${part}" is outside that range.` };
    }

    ranges.push({ start, end });
  }

  return { ranges };
}
