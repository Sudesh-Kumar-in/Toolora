import { AlignmentType, BorderStyle, Document, Paragraph, TextRun } from "docx";
import type { DocModel, TemplateStyle } from "./doc-model";

/**
 * Builds a docx Document. Word stores text as Unicode, so this output supports any
 * language. Packing to a file happens in the calling component (Packer.toBlob in the browser).
 */
export function buildDocx(doc: DocModel, t: TemplateStyle): Document {
  const accent = t.accentHex.slice(1);
  const children: Paragraph[] = [];

  children.push(new Paragraph({
    spacing: { after: 60 },
    children: [new TextRun({ text: doc.name || "Your name", bold: true, size: 44, font: t.docxFont })],
  }));
  if (doc.headline) {
    children.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: doc.headline, size: 24, color: accent, font: t.docxFont })],
    }));
  }
  if (doc.contact.length) {
    children.push(new Paragraph({
      spacing: { after: 240 },
      children: [new TextRun({ text: doc.contact.join("   |   "), size: 18, color: "5B6672", font: t.docxFont })],
    }));
  }

  for (const section of doc.sections) {
    if (section.heading) {
      children.push(new Paragraph({
        spacing: { before: 240, after: 120 },
        border: t.headingRule ? { bottom: { color: accent, space: 2, style: BorderStyle.SINGLE, size: 6 } } : undefined,
        children: [new TextRun({
          text: t.uppercaseHeadings ? section.heading.toUpperCase() : section.heading,
          bold: true, size: 22, color: accent, font: t.docxFont,
        })],
      }));
    }

    for (const entry of section.entries ?? []) {
      children.push(new Paragraph({
        spacing: { before: 120 },
        children: [new TextRun({ text: entry.title, bold: true, size: 21, font: t.docxFont })],
      }));
      if (entry.subtitle || entry.dates) {
        const runs: TextRun[] = [];
        if (entry.subtitle) runs.push(new TextRun({ text: entry.subtitle, size: 19, color: "5B6672", font: t.docxFont }));
        if (entry.dates) runs.push(new TextRun({ text: `${entry.subtitle ? "   " : ""}${entry.dates}`, size: 19, color: "5B6672", font: t.docxFont }));
        children.push(new Paragraph({ spacing: { after: 60 }, children: runs }));
      }
      for (const b of entry.bullets ?? []) {
        children.push(new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text: b, size: 20, font: t.docxFont })],
        }));
      }
    }

    for (const line of section.lines ?? []) {
      children.push(new Paragraph({
        spacing: { after: 100 },
        alignment: AlignmentType.LEFT,
        children: [new TextRun({ text: line, size: 20, font: t.docxFont })],
      }));
    }
  }

  return new Document({
    creator: "Toolora",
    title: doc.name || "Document",
    sections: [{
      properties: { page: { margin: { top: 1080, bottom: 1080, left: 1080, right: 1080 } } },
      children,
    }],
  });
}
