/**
 * Text extraction for PDF to Word. The grouping logic is pure and tested. The pdf.js
 * instance is passed in, so tests can supply the Node build and the browser can supply its own.
 */
import { AlignmentType, Document, Paragraph, TextRun } from "docx";

export interface RawItem {
  str: string;
  x: number;
  y: number;
  height: number;
  /** Measured width from the PDF, when available. Preferred over estimates. */
  width?: number;
}

export interface Line {
  text: string;
  y: number;
  height: number;
}

/** Groups positioned text fragments into reading-order lines. */
export function groupIntoLines(items: RawItem[]): Line[] {
  const cleaned = items.filter((i) => i.str.trim().length > 0);
  // Top of page first (higher y is higher on the page in PDF coordinates).
  const sorted = [...cleaned].sort((a, b) => b.y - a.y || a.x - b.x);
  const lines: { items: RawItem[]; y: number; height: number }[] = [];

  for (const item of sorted) {
    const h = item.height > 0 ? item.height : 10;
    const current = lines[lines.length - 1];
    if (current && Math.abs(current.y - item.y) <= h * 0.5) {
      current.items.push(item);
    } else {
      lines.push({ items: [item], y: item.y, height: h });
    }
  }

  return lines.map((l) => {
    const parts = [...l.items].sort((a, b) => a.x - b.x);
    let text = "";
    let prevEnd: number | null = null;
    for (const p of parts) {
      if (prevEnd !== null && p.x - prevEnd > 1) text += " ";
      text += p.str;
      prevEnd = p.x + estimateWidth(p);
    }
    return { text: text.replace(/\s+/g, " ").trim(), y: l.y, height: l.height };
  });
}

function estimateWidth(item: RawItem): number {
  if (item.width !== undefined && item.width > 0) return item.width;
  return item.str.length * item.height * 0.5;
}

/** Starts a new paragraph when the vertical gap is clearly larger than normal line spacing. */
export function groupIntoParagraphs(lines: Line[]): string[] {
  const paragraphs: string[] = [];
  let current = "";
  let prev: Line | null = null;
  for (const line of lines) {
    if (!line.text) continue;
    if (prev) {
      const gap = prev.y - line.y;
      const breakParagraph = gap > prev.height * 1.6;
      if (breakParagraph && current) {
        paragraphs.push(current);
        current = "";
      }
    }
    current = current ? `${current} ${line.text}` : line.text;
    prev = line;
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}

export interface PdfJsPage {
  getTextContent(): Promise<{ items: unknown[] }>;
  getViewport(params: { scale: number; rotation?: number }): { width: number; height: number };
  render(params: { canvasContext: CanvasRenderingContext2D; viewport: unknown; canvas?: HTMLCanvasElement }): { promise: Promise<void> };
  cleanup(): void;
}

export interface PdfJsDocument {
  numPages: number;
  getPage(n: number): Promise<PdfJsPage>;
  destroy?: () => Promise<void>;
}

export interface PdfJsLib {
  getDocument(params: { data: Uint8Array; isEvalSupported?: boolean }): { promise: Promise<PdfJsDocument> };
}

export interface ExtractedPages {
  pages: string[][];       // per page: list of paragraphs
  characterCount: number;
}

export async function extractPages(data: Uint8Array, pdfjs: PdfJsLib): Promise<ExtractedPages> {
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false }).promise;
  const pages: string[][] = [];
  let characterCount = 0;

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const content = await page.getTextContent();
    const raw: RawItem[] = [];
    for (const it of content.items as { str?: string; transform?: number[]; height?: number; width?: number }[]) {
      if (typeof it.str !== "string" || !it.transform) continue;
      raw.push({
        str: it.str,
        x: it.transform[4],
        y: it.transform[5],
        height: it.height || Math.abs(it.transform[3]) || 10,
        width: typeof it.width === "number" ? it.width : undefined,
      });
    }
    const paragraphs = groupIntoParagraphs(groupIntoLines(raw));
    characterCount += paragraphs.join("").length;
    pages.push(paragraphs);
  }

  await doc.destroy?.();
  return { pages, characterCount };
}

/** Builds a Word document with one section per PDF page, separated by page breaks. */
export function textPagesToDocx(pages: string[][], title: string): Document {
  const children: Paragraph[] = [];
  pages.forEach((paragraphs, pageIndex) => {
    if (pageIndex > 0) {
      children.push(new Paragraph({ pageBreakBefore: true, children: [] }));
    }
    for (const p of paragraphs) {
      children.push(new Paragraph({
        alignment: AlignmentType.LEFT,
        spacing: { after: 160, line: 300 },
        children: [new TextRun({ text: p, size: 22 })],
      }));
    }
  });
  if (children.length === 0) {
    children.push(new Paragraph({ children: [new TextRun({ text: "" })] }));
  }
  return new Document({
    creator: "Toolora",
    title,
    sections: [{ properties: { page: { margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children }],
  });
}
