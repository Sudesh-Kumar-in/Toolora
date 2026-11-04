"use client";

import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  Download, FilePlus2, Files, Highlighter, ImagePlus, Minus, MousePointer2, Pencil, Redo2,
  Square, StickyNote, Strikethrough, TextCursorInput, Trash2, Type, Underline, Undo2, ZoomIn, ZoomOut, Circle, RotateCcw, RotateCw,
} from "lucide-react";
import { FileDropzone } from "@/components/tools/shared/file-dropzone";
import { BusyStatus, ErrorStatus, SuccessStatus } from "@/components/tools/shared/tool-status";
import { PageView, type Style, type Tool } from "@/components/pdf-editor/page-view";
import { PageList } from "@/components/pdf-editor/page-list";
import { openPdfDocument, pageTextRects, type OpenedDoc, type TextRect } from "@/lib/pdf-editor-render";
import {
  EMPTY_DOC, PAGE_SIZES, addAnnotation, appendSource, commit, createHistory, deletePages, insertBlankPage, movePage,
  newId, redo, removeAnnotation, rotatePage, translateAnnotation, undo, updateAnnotation, type Annotation, type EditorDoc, type History,
} from "@/lib/pdf-editor-state";
import { exportEditedPdf } from "@/lib/pdf-editor-export";
import { downloadBlob } from "@/lib/download";
import { outputName } from "@/lib/files";

const MAX_BYTES = 80 * 1024 * 1024;
const TOOLS: { id: Tool; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { id: "select", label: "Select and move", icon: MousePointer2 },
  { id: "text", label: "Add text box", icon: Type },
  { id: "edit-text", label: "Edit existing text", icon: TextCursorInput },
  { id: "highlight", label: "Highlight", icon: Highlighter },
  { id: "underline", label: "Underline", icon: Underline },
  { id: "strike", label: "Strikethrough", icon: Strikethrough },
  { id: "draw", label: "Freehand drawing", icon: Pencil },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "ellipse", label: "Circle or ellipse", icon: Circle },
  { id: "line", label: "Line", icon: Minus },
  { id: "note", label: "Note", icon: StickyNote },
];

const DEFAULT_STYLE: Style = {
  color: "#E11D48",
  highlightColor: "#FFE066",
  font: "Helvetica",
  size: 16,
  bold: false,
  brush: 3,
  strokeWidth: 2,
  fill: false,
};

interface SourceState { id: string; name: string; bytes: Uint8Array; opened: OpenedDoc }
interface AssetState { bytes: Uint8Array; type: "png" | "jpg"; url: string }

export default function PdfEditor() {
  const [hist, setHist] = useState<History<EditorDoc>>(() => createHistory(EMPTY_DOC));
  const doc = hist.present;
  const docRef = useRef(doc);
  docRef.current = doc;

  const [sources, setSources] = useState<Record<string, SourceState>>({});
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const assetsRef = useRef<Record<string, AssetState>>({});
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [textCache, setTextCache] = useState<Record<string, TextRect[]>>({});

  const [tool, setTool] = useState<Tool>("select");
  const [style, setStyle] = useState<Style>(DEFAULT_STYLE);
  const [zoom, setZoom] = useState(1);
  const [selected, setSelected] = useState<{ pageId: string; annId: string } | null>(null);
  const [selectedPageIds, setSelectedPageIds] = useState<string[]>([]);
  const [currentPageId, setCurrentPageId] = useState<string | null>(null);
  const [pendingEdit, setPendingEdit] = useState<{ pageId: string; rect: TextRect } | null>(null);
  const [editText, setEditText] = useState("");
  const [blankSize, setBlankSize] = useState<"A4" | "Letter">("A4");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const openRef = useRef<HTMLInputElement>(null);
  const mergeRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);

  const apply = useCallback((next: EditorDoc) => setHist((h) => commit(h, next)), []);

  /* ---------- opening and merging ---------- */

  async function ingest(file: File, replace: boolean) {
    setError(null);
    setNotice(null);
    setBusy(`Opening ${file.name}`);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const opened = await openPdfDocument(bytes);
      const id = newId("src");
      const source: SourceState = { id, name: file.name, bytes, opened };
      const pages = opened.pages.map((p, index) => ({
        id: newId("p"),
        index,
        view: { w: p.view.x1 - p.view.x0, h: p.view.y1 - p.view.y0 },
        baseRotation: p.base,
      }));
      const base = replace ? EMPTY_DOC : docRef.current;
      const next = appendSource(base, { id, name: file.name, pageCount: pages.length }, pages);
      if (replace) {
        sourcesRef.current = {};
        assetsRef.current = {};
        setSources({ [id]: source });
        setImageUrls({});
        setTextCache({});
        setSelected(null);
        setSelectedPageIds([]);
        setPendingEdit(null);
        setHist(createHistory(next));
      } else {
        setSources((s) => ({ ...s, [id]: source }));
        apply(next);
        setNotice(`Merged ${pages.length} pages from ${file.name}.`);
      }
      setCurrentPageId(next.pages[base.pages.length]?.id ?? next.pages[0]?.id ?? null);
    } catch (err) {
      const pwd = err instanceof Error && /password/i.test(err.message);
      setError(pwd
        ? "This PDF is password protected. Unlock it with the PDF Lock & Unlock tool first."
        : "This PDF could not be opened. It may be damaged or not a PDF.");
    } finally {
      setBusy(null);
    }
  }

  /* ---------- text on pages ---------- */

  const needText = useCallback(async (pageId: string) => {
    if (textCache[pageId]) return;
    const d = docRef.current;
    const page = d.pages.find((p) => p.id === pageId);
    if (!page || page.source === "blank") { setTextCache((c) => ({ ...c, [pageId]: [] })); return; }
    const src = sourcesRef.current[page.source];
    if (!src) return;
    const view = { x0: 0, y0: 0, x1: page.view.w, y1: page.view.h };
    try {
      const rects = await pageTextRects(src.opened.pdf, page.index + 1, view);
      setTextCache((c) => ({ ...c, [pageId]: rects }));
    } catch {
      setTextCache((c) => ({ ...c, [pageId]: [] }));
    }
  }, [textCache]);

  /* ---------- annotation actions ---------- */

  function addAnn(pageId: string, ann: Annotation) {
    apply(addAnnotation(docRef.current, pageId, ann));
    setCurrentPageId(pageId);
  }

  function moveAnn(pageId: string, annId: string, dx: number, dy: number) {
    const next: EditorDoc = {
      ...docRef.current,
      pages: docRef.current.pages.map((p) => p.id !== pageId ? p : {
        ...p,
        anns: p.anns.map((a) => (a.id === annId ? translateAnnotation(a, dx, dy) : a)),
      }),
    };
    apply(next);
  }

  function patchSelected(patch: Partial<Annotation>) {
    if (!selected) return;
    apply(updateAnnotation(docRef.current, selected.pageId, selected.annId, patch));
  }

  function deleteSelectedAnn() {
    if (!selected) return;
    apply(removeAnnotation(docRef.current, selected.pageId, selected.annId));
    setSelected(null);
  }

  function selectedAnnotation(): Annotation | undefined {
    if (!selected) return undefined;
    return docRef.current.pages.find((p) => p.id === selected.pageId)?.anns.find((a) => a.id === selected.annId);
  }

  function replaceExistingText(erase: boolean) {
    if (!pendingEdit) return;
    const { pageId, rect } = pendingEdit;
    const pad = 1.5;
    let next = addAnnotation(docRef.current, pageId, {
      id: newId("a"), kind: "cover", x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2, color: "#FFFFFF",
    });
    if (!erase && editText.trim()) {
      next = addAnnotation(next, pageId, {
        id: newId("a"), kind: "text", x: rect.x, y: rect.y, text: editText.trim(), size: Math.max(6, rect.h * 0.9),
        font: "Helvetica", bold: false, color: "#000000",
      });
    }
    apply(next);
    setPendingEdit(null);
    setNotice(erase
      ? "The original text is covered with a white box. See the note in the panel about what this does."
      : "The original text is covered and the replacement is placed in the same spot.");
  }

  function highlightExisting(rect: TextRect, kind: "highlight" | "underline" | "strike", pageId: string) {
    addAnn(pageId, {
      id: newId("a"), kind, x: rect.x, y: rect.y, w: rect.w, h: rect.h,
      color: kind === "highlight" ? style.highlightColor : style.color,
    });
  }

  /* ---------- page actions ---------- */

  function rotate(pageId: string, turns: 1 | -1) {
    apply(rotatePage(docRef.current, pageId, turns));
  }

  function movePageAt(from: number, to: number) {
    apply(movePage(docRef.current, from, to));
  }

  function deletePagesByIds(ids: string[]) {
    const r = deletePages(docRef.current, ids);
    if (r.error) return setError(r.error);
    setError(null);
    apply(r.doc);
    setSelectedPageIds([]);
    if (currentPageId && !r.doc.pages.some((p) => p.id === currentPageId)) setCurrentPageId(r.doc.pages[0]?.id ?? null);
    setSelected(null);
  }

  function addBlank() {
    const idx = doc.pages.findIndex((p) => p.id === currentPageId);
    const id = newId("p");
    apply(insertBlankPage(doc, idx, PAGE_SIZES[blankSize], id));
    setCurrentPageId(id);
    setNotice(`Added a blank ${blankSize} page after page ${idx + 1 || doc.pages.length}.`);
  }

  async function insertImage(file: File) {
    setError(null);
    try {
      const bmp = await createImageBitmap(file);
      const type: "png" | "jpg" = file.type === "image/png" ? "png" : "jpg";
      if (file.type !== "image/png" && file.type !== "image/jpeg") throw new Error("Choose a PNG or JPG image.");
      const assetId = newId("img");
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file);
      assetsRef.current[assetId] = { bytes, type, url };
      setImageUrls((u) => ({ ...u, [assetId]: url }));
      const target = doc.pages.find((p) => p.id === currentPageId) ?? doc.pages[0];
      if (!target) return;
      const w = Math.min(240, target.view.w * 0.6);
      const h = w * (bmp.height / bmp.width);
      bmp.close();
      addAnn(target.id, {
        id: newId("a"), kind: "image", assetId, w, h,
        x: (target.view.w - w) / 2, y: (target.view.h - h) / 2, color: "#000000",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "This image could not be inserted.");
    }
  }

  /* ---------- export ---------- */

  async function exportNow() {
    setError(null);
    setNotice(null);
    setBusy("Building the edited PDF");
    try {
      const srcBytes: Record<string, Uint8Array> = {};
      for (const [id, s] of Object.entries(sourcesRef.current) as [string, SourceState][]) srcBytes[id] = s.bytes;
      const assets: Record<string, { bytes: Uint8Array; type: "png" | "jpg" }> = {};
      for (const [id, a] of Object.entries(assetsRef.current) as [string, AssetState][]) assets[id] = { bytes: a.bytes, type: a.type };
      const bytes = await exportEditedPdf(docRef.current, srcBytes, assets);
      const base = (Object.values(sourcesRef.current) as SourceState[])[0]?.name ?? "document.pdf";
      downloadBlob(new Blob([bytes as BlobPart], { type: "application/pdf" }), outputName(base, "-edited", "pdf"));
      setNotice(`Exported ${docRef.current.pages.length} pages.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  /* ---------- keyboard ---------- */

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && !typing && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); setHist((h) => undo(h)); return; }
      if (mod && !typing && ((e.key.toLowerCase() === "z" && e.shiftKey) || e.key.toLowerCase() === "y")) { e.preventDefault(); setHist((h) => redo(h)); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !typing && selected) {
        e.preventDefault();
        apply(removeAnnotation(docRef.current, selected.pageId, selected.annId));
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [apply, selected]);

  const selAnn = selectedAnnotation();
  const hasDoc = doc.pages.length > 0;
  const textTool = tool === "edit-text" || tool === "highlight" || tool === "underline" || tool === "strike";


  if (!hasDoc) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <FileDropzone id="pdfed-open" label="Open a PDF to start editing" hint="Pages are shown here as you edit them. Nothing is uploaded." accept={["application/pdf"]} maxBytes={MAX_BYTES} maxCount={1} onFiles={(l) => ingest(l[0], true)} disabled={busy !== null} />
        {busy && <BusyStatus message={busy} />}
        {error && <ErrorStatus message={error} />}
        <p className="text-sm leading-relaxed text-ink-mute">
          The editor keeps your original pages, fonts and images. Changes are drawn on top, so text that was already in the PDF stays as it was.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="sticky top-16 z-20 -mx-1 flex flex-wrap items-center gap-2 rounded-2xl border border-ink/10 bg-paper-raised/95 p-2 shadow-card backdrop-blur">
        <div role="toolbar" aria-label="Editing tools" className="flex flex-wrap gap-1">
          {TOOLS.map((t) => (
            <button key={t.id} type="button" aria-label={t.label} title={t.label} aria-pressed={tool === t.id}
              onClick={() => { setTool(t.id); setPendingEdit(null); }}
              className={`rounded-lg p-2 ${tool === t.id ? "bg-ink text-paper-raised" : "text-ink-soft hover:bg-ink/5"} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt`}>
              <t.icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div className="mx-1 h-6 w-px bg-ink/10" aria-hidden="true" />
        <div className="flex gap-1">
          <IconButton label="Undo" disabled={hist.past.length === 0} onClick={() => setHist((h) => undo(h))}><Undo2 className="h-4 w-4" aria-hidden="true" /></IconButton>
          <IconButton label="Redo" disabled={hist.future.length === 0} onClick={() => setHist((h) => redo(h))}><Redo2 className="h-4 w-4" aria-hidden="true" /></IconButton>
        </div>
        <div className="mx-1 h-6 w-px bg-ink/10" aria-hidden="true" />
        <div className="flex items-center gap-1">
          <IconButton label="Zoom out" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.25).toFixed(2)))}><ZoomOut className="h-4 w-4" aria-hidden="true" /></IconButton>
          <span className="w-12 text-center font-mono text-xs" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <IconButton label="Zoom in" disabled={zoom >= 3} onClick={() => setZoom((z) => Math.min(3, +(z + 0.25).toFixed(2)))}><ZoomIn className="h-4 w-4" aria-hidden="true" /></IconButton>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn-secondary !px-3 !py-2" onClick={() => { if (window.confirm("Open a different PDF? Your unsaved edits in this document will be discarded.")) openRef.current?.click(); }} disabled={busy !== null}>
            <FilePlus2 className="h-4 w-4" aria-hidden="true" />Open another
          </button>
          <button type="button" className="btn-primary !px-4 !py-2" onClick={exportNow} disabled={busy !== null}>
            <Download className="h-4 w-4" aria-hidden="true" />Export PDF
          </button>
        </div>
        <input ref={openRef} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) ingest(f, true); }} />
        <input ref={mergeRef} type="file" accept="application/pdf" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) ingest(f, false); }} />
        <input ref={imageRef} type="file" accept="image/png,image/jpeg" className="sr-only" tabIndex={-1} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) insertImage(f); }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[210px_minmax(0,1fr)_290px]">
        {/* Pages */}
        <aside className="space-y-3 lg:max-h-[78vh] lg:overflow-y-auto lg:pr-1" aria-label="Page tools">
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className="btn-secondary !px-2 !py-2 text-xs" disabled={selectedPageIds.length === 0} onClick={() => selectedPageIds.forEach((id) => rotate(id, -1))}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />Rotate left</button>
            <button type="button" className="btn-secondary !px-2 !py-2 text-xs" disabled={selectedPageIds.length === 0} onClick={() => selectedPageIds.forEach((id) => rotate(id, 1))}><RotateCw className="h-3.5 w-3.5" aria-hidden="true" />Rotate right</button>
            <button type="button" className="btn-secondary !px-2 !py-2 text-xs" disabled={selectedPageIds.length === 0} onClick={() => deletePagesByIds(selectedPageIds)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" />Delete selected</button>
            <button type="button" className="btn-secondary !px-2 !py-2 text-xs" onClick={() => mergeRef.current?.click()} disabled={busy !== null}><Files className="h-3.5 w-3.5" aria-hidden="true" />Merge a PDF</button>
          </div>
          <p className="text-xs text-ink-mute">Tick pages to act on several at once. Drag a thumbnail to reorder, or use the arrows.</p>
          <PageList
            pages={doc.pages}
            sources={Object.fromEntries((Object.entries(sources) as [string, SourceState][]).map(([id, s]) => [id, s.opened]))}
            selectedIds={selectedPageIds}
            currentId={currentPageId}
            onToggle={(id) => setSelectedPageIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id])}
            onFocus={(id) => setCurrentPageId(id)}
            onRotate={rotate}
            onMove={movePageAt}
            onDelete={(id) => deletePagesByIds([id])}
          />
        </aside>

        {/* Pages canvas */}
        <main className="min-w-0 space-y-6 rounded-2xl border border-ink/10 bg-paper-sunk/60 p-3 sm:p-5 lg:max-h-[78vh] lg:overflow-auto" aria-label="Document pages">
          {doc.pages.map((page, i) => {
            const src = page.source === "blank" ? null : sources[page.source]?.opened ?? null;
            return (
              <div key={page.id} className="space-y-1">
                <p className="text-xs font-medium text-ink-mute">Page {i + 1}</p>
                <PageView
                  page={page}
                  pageNumber={i + 1}
                  opened={src}
                  zoom={zoom}
                  tool={tool}
                  style={style}
                  selectedAnnId={selected?.pageId === page.id ? selected.annId : null}
                  textRects={textCache[page.id] ?? null}
                  imageUrls={imageUrls}
                  onActivate={() => setCurrentPageId(page.id)}
                  onSelectAnn={(annId) => setSelected(annId ? { pageId: page.id, annId } : null)}
                  onAdd={(ann) => addAnn(page.id, ann)}
                  onMove={(annId, dx, dy) => moveAnn(page.id, annId, dx, dy)}
                  onNeedText={() => needText(page.id)}
                  onTextHit={(rect, t) => highlightExisting(rect, t as "highlight" | "underline" | "strike", page.id)}
                  onEditText={(rect) => { setPendingEdit({ pageId: page.id, rect }); setEditText(rect.str); setTool("edit-text"); }}
                />
              </div>
            );
          })}
          {textTool && (
            <p className="rounded-xl bg-amber-wash px-4 py-3 text-xs leading-relaxed text-ink-soft">
              {tool === "edit-text"
                ? "Click a line of existing text to replace or erase it."
                : "Click a line of existing text to mark it, or drag across any area to mark that area."}
            </p>
          )}
        </main>

        {/* Properties */}
        <aside className="h-fit space-y-6 rounded-2xl border border-ink/10 bg-paper-raised p-4 shadow-card lg:sticky lg:top-40 lg:max-h-[78vh] lg:overflow-y-auto" aria-label="Properties">
          <section className="space-y-3">
            <h2 className="text-base font-display">New items</h2>
            <div className="grid grid-cols-2 gap-3">
              <ColorField id="pe-color" label="Colour" value={style.color} onChange={(v) => setStyle((s) => ({ ...s, color: v }))} />
              <ColorField id="pe-hl" label="Highlight" value={style.highlightColor} onChange={(v) => setStyle((s) => ({ ...s, highlightColor: v }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="pe-font" className="text-xs font-medium text-ink-mute">Font</label>
                <select id="pe-font" value={style.font} onChange={(e) => setStyle((s) => ({ ...s, font: e.target.value as Style["font"] }))} className="field mt-1 !py-2 text-sm">
                  <option value="Helvetica">Sans</option>
                  <option value="Times-Roman">Serif</option>
                  <option value="Courier">Mono</option>
                </select>
              </div>
              <div>
                <label htmlFor="pe-size" className="text-xs font-medium text-ink-mute">Text size</label>
                <input id="pe-size" type="number" min={6} max={96} value={style.size} onChange={(e) => setStyle((s) => ({ ...s, size: clampNum(e.target.value, 6, 96, s.size) }))} className="field mt-1 !py-2 text-sm" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-cobalt" checked={style.bold} onChange={(e) => setStyle((s) => ({ ...s, bold: e.target.checked }))} />Bold text</label>
            <div>
              <label htmlFor="pe-brush" className="flex justify-between text-xs font-medium text-ink-mute"><span>Brush size</span><span className="font-mono">{style.brush}</span></label>
              <input id="pe-brush" type="range" min={1} max={20} value={style.brush} onChange={(e) => setStyle((s) => ({ ...s, brush: Number(e.target.value) }))} className="mt-1 w-full accent-cobalt" />
            </div>
            <div>
              <label htmlFor="pe-stroke" className="flex justify-between text-xs font-medium text-ink-mute"><span>Shape outline</span><span className="font-mono">{style.strokeWidth}</span></label>
              <input id="pe-stroke" type="range" min={1} max={12} value={style.strokeWidth} onChange={(e) => setStyle((s) => ({ ...s, strokeWidth: Number(e.target.value) }))} className="mt-1 w-full accent-cobalt" />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink"><input type="checkbox" className="accent-cobalt" checked={style.fill} onChange={(e) => setStyle((s) => ({ ...s, fill: e.target.checked }))} />Fill shapes</label>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-display">Selected item</h2>
            {selAnn ? (
              <>
                <p className="text-sm text-ink-soft">{labelFor(selAnn.kind)}</p>
                {(selAnn.kind === "text" || selAnn.kind === "note") && (
                  <div>
                    <label htmlFor="pe-text" className="text-xs font-medium text-ink-mute">Text (use Enter for new lines)</label>
                    <textarea id="pe-text" rows={3} value={selAnn.text} onChange={(e) => patchSelected({ text: e.target.value } as Partial<Annotation>)} className="field mt-1 !py-2 text-sm" />
                  </div>
                )}
                {selAnn.kind === "text" && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-ink-mute" htmlFor="pe-sel-size">Size</label>
                      <input id="pe-sel-size" type="number" min={6} max={96} value={selAnn.size} onChange={(e) => patchSelected({ size: clampNum(e.target.value, 6, 96, selAnn.size) } as Partial<Annotation>)} className="field mt-1 !py-2 text-sm" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-ink-mute" htmlFor="pe-sel-font">Font</label>
                      <select id="pe-sel-font" value={selAnn.font} onChange={(e) => patchSelected({ font: e.target.value } as Partial<Annotation>)} className="field mt-1 !py-2 text-sm">
                        <option value="Helvetica">Sans</option><option value="Times-Roman">Serif</option><option value="Courier">Mono</option>
                      </select>
                    </div>
                  </div>
                )}
                {selAnn.kind !== "image" && selAnn.kind !== "cover" && (
                  <ColorField id="pe-sel-color" label="Colour" value={selAnn.color} onChange={(v) => patchSelected({ color: v })} />
                )}
                <button type="button" className="btn-secondary w-full" onClick={deleteSelectedAnn}><Trash2 className="h-4 w-4" aria-hidden="true" />Delete item</button>
              </>
            ) : (
              <p className="text-sm text-ink-mute">Choose the Select tool and click an item to edit it. Press Delete to remove it.</p>
            )}
          </section>

          {pendingEdit && (
            <section className="space-y-3 rounded-xl bg-cobalt-wash p-3">
              <h2 className="text-base font-display">Replace existing text</h2>
              <p className="text-xs text-ink-mute">Original: “{pendingEdit.rect.str}”</p>
              <div>
                <label htmlFor="pe-replace" className="text-xs font-medium text-ink-mute">New text</label>
                <input id="pe-replace" value={editText} onChange={(e) => setEditText(e.target.value)} className="field mt-1 !py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="btn-primary !px-3 !py-2 text-xs" onClick={() => replaceExistingText(false)}>Replace</button>
                <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => replaceExistingText(true)}>Erase</button>
              </div>
              <button type="button" className="text-xs text-ink-mute underline" onClick={() => setPendingEdit(null)}>Cancel</button>
              <p className="text-xs leading-relaxed text-ink-soft">
                PDF files store text in a way that cannot be rewritten safely in a browser. Replace and Erase cover the original words with a white box and place new text on top. The original characters remain in the file, and copy or search tools may still find them. Use this for presentation changes, not for removing sensitive information.
              </p>
            </section>
          )}

          <section className="space-y-3">
            <h2 className="text-base font-display">Pages</h2>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label htmlFor="pe-blank" className="text-xs font-medium text-ink-mute">Blank page size</label>
                <select id="pe-blank" value={blankSize} onChange={(e) => setBlankSize(e.target.value as "A4" | "Letter")} className="field mt-1 !py-2 text-sm">
                  <option value="A4">A4</option><option value="Letter">Letter</option>
                </select>
              </div>
              <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={addBlank}><FilePlus2 className="h-3.5 w-3.5" aria-hidden="true" />Add blank page</button>
            </div>
            <button type="button" className="btn-secondary w-full" onClick={() => imageRef.current?.click()}><ImagePlus className="h-4 w-4" aria-hidden="true" />Insert image (PNG or JPG)</button>
            <p className="text-xs text-ink-mute">{doc.pages.length} {doc.pages.length === 1 ? "page" : "pages"}. Undo {hist.past.length} · Redo {hist.future.length}.</p>
          </section>
        </aside>
      </div>

      {busy && <BusyStatus message={busy} />}
      {error && <ErrorStatus message={error} />}
      {notice && !error && <SuccessStatus message={notice} />}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="rounded-lg p-2 text-ink-soft hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
      {children}
    </button>
  );
}

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-ink-mute">{label}</label>
      <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-9 w-full cursor-pointer rounded-lg border border-ink/15 bg-paper-raised p-1" />
    </div>
  );
}

function clampNum(text: string, min: number, max: number, fallback: number): number {
  const n = Number(text);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function labelFor(kind: Annotation["kind"]): string {
  const map: Record<Annotation["kind"], string> = {
    text: "Text box", cover: "White cover (replaced text)", highlight: "Highlight", underline: "Underline",
    strike: "Strikethrough", ink: "Freehand drawing", rect: "Rectangle", ellipse: "Circle or ellipse",
    line: "Line", note: "Note", image: "Image",
  };
  return map[kind];
}
