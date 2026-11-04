"use client";

import { useState } from "react";
import { Packer } from "docx";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { ResultRow } from "@/components/tools/shared/result-row";
import { loadPdfJs, isPasswordError } from "@/lib/pdfjs-browser";
import { extractPages, textPagesToDocx, type ExtractedPages } from "@/lib/pdf-text";
import { outputName } from "@/lib/files";

const MAX_BYTES = 50 * 1024 * 1024;
const MIN_CHARACTERS = 30;

export default function PdfToWord() {
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedPages | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ name: string; blob: Blob; originalSize: number } | null>(null);

  async function onFile(list: File[]) {
    setError(null);
    setResult(null);
    setExtracted(null);
    setFile(list[0]);
    setBusy("Reading text from the PDF");
    try {
      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(await list[0].arrayBuffer());
      const pages = await extractPages(data, pdfjs);
      if (pages.characterCount < MIN_CHARACTERS) {
        setError("This PDF has no selectable text. It is probably a scan or a photo of a page. Text recognition (OCR) is not included in this tool, so the file cannot be converted to editable Word text.");
        setFile(null);
      } else {
        setExtracted(pages);
      }
    } catch (err) {
      setFile(null);
      setError(isPasswordError(err)
        ? "This PDF is password protected. Unlock it with the PDF Lock & Unlock tool first."
        : "This PDF could not be read. It may be damaged.");
    } finally {
      setBusy(null);
    }
  }

  async function convert() {
    if (!file || !extracted) return setError("Choose a PDF first.");
    setError(null);
    setResult(null);
    setBusy("Building the Word document");
    try {
      const blob = await Packer.toBlob(textPagesToDocx(extracted.pages, file.name));
      setResult({ name: outputName(file.name, "", "docx"), blob, originalSize: file.size });
    } catch {
      setError("The Word document could not be created. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const totalParagraphs = extracted?.pages.reduce((n, p) => n + p.length, 0) ?? 0;

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-5">
        <FileDropzone id="pdfword-input" label="Drop a PDF here or click to choose" hint="Works with PDFs that contain selectable text." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={onFile} disabled={busy !== null} />
        <div className="rounded-2xl border border-ink/10 bg-paper-raised p-4 text-sm leading-relaxed text-ink-soft">
          <p className="font-medium text-ink">What is kept</p>
          <p className="mt-1">Text, paragraphs and page breaks, as an editable Word file with Unicode support.</p>
          <p className="mt-3 font-medium text-ink">What is not kept</p>
          <p className="mt-1">Exact fonts, columns, tables, images and graphics. Complex layouts come out as plain text, so check the result.</p>
        </div>
        {extracted && (
          <button type="button" className="btn-primary w-full" disabled={busy !== null} onClick={convert}>Convert to Word (.docx)</button>
        )}
      </div>

      <div className="space-y-4">
        {busy && <BusyStatus message={busy} />}
        {error && <ErrorStatus message={error} />}
        {extracted && (
          <section aria-label="Text preview" className="rounded-2xl border border-ink/10 bg-paper-raised p-5">
            <h2 className="text-base">Preview</h2>
            <p className="mt-1 text-xs text-ink-mute">{extracted.pages.length} {extracted.pages.length === 1 ? "page" : "pages"} · {totalParagraphs} paragraphs</p>
            <div className="mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-2 text-sm leading-relaxed text-ink-soft">
              {extracted.pages.flatMap((paras, pi) => [
                <p key={`pg-${pi}`} className="text-xs font-medium uppercase tracking-wide text-ink-mute">Page {pi + 1}</p>,
                ...paras.slice(0, 80).map((p, i) => <p key={`${pi}-${i}`}>{p}</p>),
              ]).slice(0, 400)}
            </div>
          </section>
        )}
        {result && (
          <section aria-label="Result" className="space-y-3">
            <SuccessStatus message="Your Word document is ready. Open it in Word, Google Docs or LibreOffice." />
            <ResultRow filename={result.name} blob={result.blob} originalSize={result.originalSize} />
          </section>
        )}
      </div>
    </div>
  );
}
