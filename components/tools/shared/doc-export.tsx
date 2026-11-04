"use client";

import { useState } from "react";
import { Packer } from "docx";
import { Download, FileText } from "lucide-react";
import { CopyButton } from "@/components/tools/shared/copy-button";
import { ErrorStatus, BusyStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { docToPlainText, type DocModel, type TemplateStyle } from "@/lib/doc-model";
import { renderDocPdf, UnsupportedCharacterError } from "@/lib/render-pdf";
import { buildDocx } from "@/lib/render-docx";
import { downloadBlob } from "@/lib/download";

/** Download as PDF or Word, and copy as text. Used by every document tool. */
export function DocExport({
  doc,
  template,
  fileBase,
  disabled,
  validationError,
}: {
  doc: DocModel;
  template: TemplateStyle;
  fileBase: string;
  disabled?: boolean;
  validationError: string | null;
}) {
  const [busy, setBusy] = useState<"pdf" | "docx" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const safeBase = fileBase.replace(/[^a-z0-9-_ ]/gi, "").trim().replace(/\s+/g, "-") || "document";

  async function exportPdf() {
    setError(null);
    setDone(null);
    if (validationError) return setError(validationError);
    setBusy("pdf");
    try {
      const bytes = await renderDocPdf(doc, template);
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), `${safeBase}.pdf`);
      setDone("PDF downloaded.");
    } catch (err) {
      setError(
        err instanceof UnsupportedCharacterError
          ? err.message
          : "The PDF could not be created. Try again, or use the Word download.",
      );
    } finally {
      setBusy(null);
    }
  }

  async function exportDocx() {
    setError(null);
    setDone(null);
    if (validationError) return setError(validationError);
    setBusy("docx");
    try {
      const blob = await Packer.toBlob(buildDocx(doc, template));
      downloadBlob(blob, `${safeBase}.docx`);
      setDone("Word document downloaded.");
    } catch {
      setError("The Word file could not be created. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const text = validationError ? "" : docToPlainText(doc);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <button type="button" onClick={exportPdf} disabled={disabled || busy !== null} className="btn-primary">
          <Download className="h-4 w-4" aria-hidden="true" />Download PDF
        </button>
        <button type="button" onClick={exportDocx} disabled={disabled || busy !== null} className="btn-secondary">
          <FileText className="h-4 w-4" aria-hidden="true" />Download Word
        </button>
        <CopyButton text={text} label="Copy as text" />
      </div>
      {validationError && <p role="alert" className="text-sm text-red-700">{validationError}</p>}
      {busy && <BusyStatus message={busy === "pdf" ? "Creating PDF" : "Creating Word document"} />}
      {error && <ErrorStatus message={error} />}
      {done && !error && <SuccessStatus message={done} />}
    </div>
  );
}
