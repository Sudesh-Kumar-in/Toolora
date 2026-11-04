import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { DocModel, TemplateStyle } from "./doc-model";

/** Thrown when text uses characters the PDF standard fonts cannot display (e.g. Devanagari). */
export class UnsupportedCharacterError extends Error {}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - 2 * MARGIN;

/** Greedy word wrap. Words longer than the line are broken by character. */
export function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    const flush = () => { if (line) lines.push(line); line = ""; };
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
        continue;
      }
      flush();
      if (font.widthOfTextAtSize(word, size) <= maxWidth) {
        line = word;
      } else {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth && chunk) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      }
    }
    flush();
    if (words.length === 0) lines.push("");
  }
  return lines;
}

function assertEncodable(text: string, font: PDFFont): void {
  try {
    font.encodeText(text);
  } catch {
    const bad = [...text].find((ch) => {
      try { font.encodeText(ch); return false; } catch { return true; }
    });
    throw new UnsupportedCharacterError(
      `The text contains characters that PDF standard fonts cannot display${bad ? ` (for example “${bad}”)` : ""}. ` +
      "Use the Word (.docx) download for full Unicode support, or replace those characters.",
    );
  }
}

export async function renderDocPdf(doc: DocModel, t: TemplateStyle): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(doc.name || "Document");
  pdf.setProducer("Toolora");
  const regular = await pdf.embedFont(t.font);
  const bold = await pdf.embedFont(t.fontBold);
  const accent = rgb(...t.accent);
  const grey = rgb(0.36, 0.4, 0.45);

  let page: PDFPage = pdf.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const ensure = (height: number) => {
    if (y - height < MARGIN) {
      page = pdf.addPage([PAGE_W, PAGE_H]);
      y = PAGE_H - MARGIN;
    }
  };

  const write = (
    text: string,
    font: PDFFont,
    size: number,
    opts: { x?: number; width?: number; color?: ReturnType<typeof rgb>; gap?: number } = {},
  ) => {
    assertEncodable(text, font);
    const x = opts.x ?? MARGIN;
    const width = opts.width ?? CONTENT_W;
    const lineHeight = size * 1.35;
    for (const line of wrapText(text, font, size, width)) {
      ensure(lineHeight);
      y -= lineHeight;
      if (line) page.drawText(line, { x, y, size, font, color: opts.color ?? rgb(0.07, 0.09, 0.13) });
    }
    y -= opts.gap ?? 0;
  };

  // Name and headline
  write(doc.name || "Your name", bold, 22, { gap: 2 });
  if (doc.headline) write(doc.headline, regular, 12, { color: accent, gap: 2 });
  if (doc.contact.length) write(doc.contact.join("   |   "), regular, 9, { color: grey, gap: 6 });

  for (const section of doc.sections) {
    if (section.heading) {
      y -= 12;
      ensure(24);
      const heading = t.uppercaseHeadings ? section.heading.toUpperCase() : section.heading;
      assertEncodable(heading, bold);
      y -= 14;
      page.drawText(heading, { x: MARGIN, y, size: 10.5, font: bold, color: accent });
      if (t.headingRule) {
        page.drawLine({ start: { x: MARGIN, y: y - 4 }, end: { x: PAGE_W - MARGIN, y: y - 4 }, thickness: 0.8, color: accent });
        y -= 6;
      }
      y -= 6;
    }

    for (const entry of section.entries ?? []) {
      ensure(30);
      write(entry.title, bold, 10.5, { gap: 0 });
      if (entry.subtitle || entry.dates) {
        const sub = entry.subtitle ?? "";
        assertEncodable(sub, regular);
        const dates = entry.dates ?? "";
        if (dates) assertEncodable(dates, regular);
        const datesWidth = dates ? regular.widthOfTextAtSize(dates, 9.5) : 0;
        const subWidth = CONTENT_W - datesWidth - (dates ? 12 : 0);
        const subLines = sub ? wrapText(sub, regular, 9.5, subWidth) : [];
        const count = Math.max(subLines.length, dates ? 1 : 0);
        for (let i = 0; i < count; i++) {
          ensure(13);
          y -= 13;
          if (subLines[i]) page.drawText(subLines[i], { x: MARGIN, y, size: 9.5, font: regular, color: grey });
          if (i === 0 && dates) {
            page.drawText(dates, { x: PAGE_W - MARGIN - datesWidth, y, size: 9.5, font: regular, color: grey });
          }
        }
      }
      for (const b of entry.bullets ?? []) {
        ensure(13);
        const lines = wrapText(b, regular, 10, CONTENT_W - 14);
        lines.forEach((line, i) => {
          ensure(13.5);
          y -= 13.5;
          if (i === 0) page.drawText("•", { x: MARGIN + 3, y, size: 10, font: regular, color: accent });
          page.drawText(line, { x: MARGIN + 14, y, size: 10, font: regular, color: rgb(0.07, 0.09, 0.13) });
        });
      }
      y -= 6;
    }

    for (const line of section.lines ?? []) {
      write(line, regular, 10, { gap: 4 });
    }
    y -= 4;
  }

  return pdf.save();
}
