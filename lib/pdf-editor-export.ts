import {
  degrees, LineCapStyle, PDFDocument, rgb, StandardFonts,
  type PDFFont, type PDFImage, type PDFPage, type RGB,
} from "pdf-lib";
import type { Annotation, EditorDoc, PageState, StandardFontName } from "./pdf-editor-state";

/*
 * Writes an EditorDoc to a new PDF. Original pages are copied with copyPages, so their
 * content streams, fonts and images are kept byte-for-byte. Annotations are drawn on top.
 * Coordinates: annotations are stored top-left (VIEW space); PDF space is bottom-left.
 * This file has no runtime imports from other project files, so Node tests can load it.
 */

export class EditorExportError extends Error {}

export interface AssetInput {
  bytes: Uint8Array;
  type: "png" | "jpg";
}

function hexToRgb(hex: string | undefined): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return rgb(0, 0, 0);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

type FontKey = `${StandardFontName}${"" | "-bold"}`;
const FONT_IDS: Record<FontKey, StandardFonts> = {
  "Helvetica": StandardFonts.Helvetica,
  "Helvetica-bold": StandardFonts.HelveticaBold,
  "Times-Roman": StandardFonts.TimesRoman,
  "Times-Roman-bold": StandardFonts.TimesRomanBold,
  "Courier": StandardFonts.Courier,
  "Courier-bold": StandardFonts.CourierBold,
};

function assertEncodable(text: string, font: PDFFont): void {
  try {
    font.encodeText(text);
  } catch {
    const bad = [...text].find((ch) => {
      try { font.encodeText(ch); return false; } catch { return true; }
    });
    throw new EditorExportError(
      `A text note uses characters the standard PDF fonts cannot display${bad ? ` (for example “${bad}”)` : ""}. ` +
      "Use Latin letters in text annotations, or export the document as Word text instead.",
    );
  }
}

/** Y in PDF space from a VIEW y, for a page whose media box is `mb`. */
const toPdfY = (py: number, mb: { y: number; height: number }) => mb.y + mb.height - py;

export async function exportEditedPdf(
  doc: EditorDoc,
  sources: Record<string, Uint8Array>,
  assets: Record<string, AssetInput>,
): Promise<Uint8Array> {
  if (doc.pages.length === 0) throw new EditorExportError("Add at least one page before exporting.");

  const out = await PDFDocument.create();
  out.setProducer("Toolora PDF Editor");
  const fonts = {} as Record<FontKey, PDFFont>;
  for (const key of Object.keys(FONT_IDS) as FontKey[]) {
    fonts[key] = await out.embedFont(FONT_IDS[key]);
  }
  const images: Record<string, PDFImage> = {};
  for (const [id, asset] of Object.entries(assets)) {
    images[id] = asset.type === "png" ? await out.embedPng(asset.bytes) : await out.embedJpg(asset.bytes);
  }

  const loaded = new Map<string, PDFDocument>();

  for (const page of doc.pages) {
    let pdfPage: PDFPage;
    if (page.source === "blank") {
      pdfPage = out.addPage([page.view.w, page.view.h]);
    } else {
      let src = loaded.get(page.source);
      if (!src) {
        const bytes = sources[page.source];
        if (!bytes) throw new EditorExportError("A source PDF is missing from the editor. Re-open the file and try again.");
        src = await PDFDocument.load(bytes);
        loaded.set(page.source, src);
      }
      const [copied] = await out.copyPages(src, [page.index]);
      pdfPage = out.addPage(copied);
    }

    const rotation = (((page.baseRotation + page.userRotation) % 360) + 360) % 360;
    pdfPage.setRotation(degrees(rotation));
    drawAnnotations(pdfPage, page, fonts, images);
  }

  return out.save();
}

function drawAnnotations(
  pdfPage: PDFPage,
  page: PageState,
  fonts: Record<FontKey, PDFFont>,
  images: Record<string, PDFImage>,
): void {
  const mb = pdfPage.getMediaBox();
  const X = (px: number) => mb.x + px;
  const Y = toPdfY;
  // Covers go first so that annotations placed over replaced text stay visible.
  const ordered = [...page.anns].sort((a, b) => (a.kind === "cover" ? 0 : 1) - (b.kind === "cover" ? 0 : 1));

  for (const a of ordered) {
    const color = hexToRgb(a.color);
    switch (a.kind) {
      case "cover":
        pdfPage.drawRectangle({ x: X(a.x), y: Y(a.y + a.h, mb), width: a.w, height: a.h, color });
        break;

      case "highlight":
        pdfPage.drawRectangle({ x: X(a.x), y: Y(a.y + a.h, mb), width: a.w, height: a.h, color, opacity: 0.4 });
        break;

      case "underline":
        pdfPage.drawLine({ start: { x: X(a.x), y: Y(a.y + a.h, mb) }, end: { x: X(a.x + a.w), y: Y(a.y + a.h, mb) }, thickness: 1.2, color });
        break;

      case "strike":
        pdfPage.drawLine({ start: { x: X(a.x), y: Y(a.y + a.h / 2, mb) }, end: { x: X(a.x + a.w), y: Y(a.y + a.h / 2, mb) }, thickness: 1.2, color });
        break;

      case "text": {
        const key = (a.bold ? `${a.font}-bold` : a.font) as FontKey;
        const font = fonts[key];
        const lines = a.text.split("\n");
        lines.forEach((line) => assertEncodable(line, font));
        lines.forEach((line, i) => {
          if (!line) return;
          pdfPage.drawText(line, {
            x: X(a.x),
            y: Y(a.y + a.size * 0.8 + i * a.size * 1.2, mb),
            size: a.size,
            font,
            color,
          });
        });
        break;
      }

      case "note": {
        const font = fonts.Helvetica;
        const size = 10;
        const lines = a.text.split("\n");
        lines.forEach((line) => assertEncodable(line, font));
        const boxW = 180;
        const boxH = Math.max(40, lines.length * size * 1.25 + 10);
        pdfPage.drawRectangle({
          x: X(a.x), y: Y(a.y + boxH, mb), width: boxW, height: boxH,
          color: hexToRgb("#FFE066"), borderColor: rgb(0.45, 0.4, 0.1), borderWidth: 0.8,
        });
        lines.forEach((line, i) => {
          if (!line) return;
          pdfPage.drawText(line, { x: X(a.x) + 5, y: Y(a.y + 5 + size * 0.8 + i * size * 1.25, mb), size, font, color: rgb(0.1, 0.1, 0.1) });
        });
        break;
      }

      case "ink": {
        for (let i = 1; i < a.points.length; i++) {
          const p = a.points[i - 1];
          const q = a.points[i];
          pdfPage.drawLine({
            start: { x: X(p.x), y: Y(p.y, mb) },
            end: { x: X(q.x), y: Y(q.y, mb) },
            thickness: a.width,
            color,
            lineCap: LineCapStyle.Round,
          });
        }
        break;
      }

      case "rect":
        pdfPage.drawRectangle({
          x: X(a.x), y: Y(a.y + a.h, mb), width: a.w, height: a.h,
          color: a.fill ? color : undefined, borderColor: color, borderWidth: a.width,
        });
        break;

      case "ellipse":
        pdfPage.drawEllipse({
          x: X(a.x + a.w / 2), y: Y(a.y + a.h / 2, mb), xScale: a.w / 2, yScale: a.h / 2,
          color: a.fill ? color : undefined, borderColor: color, borderWidth: a.width,
        });
        break;

      case "line":
        pdfPage.drawLine({ start: { x: X(a.x1), y: Y(a.y1, mb) }, end: { x: X(a.x2), y: Y(a.y2, mb) }, thickness: a.width, color });
        break;

      case "image": {
        const img = images[a.assetId];
        if (!img) throw new EditorExportError("An inserted image is missing. Insert it again.");
        pdfPage.drawImage(img, { x: X(a.x), y: Y(a.y + a.h, mb), width: a.w, height: a.h });
        break;
      }
    }
  }
}
