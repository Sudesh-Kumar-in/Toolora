"use client";

import { useEffect, useRef, useState, type DragEvent, type ReactNode } from "react";
import { ArrowDown, ArrowUp, RotateCcw, RotateCw, Trash2 } from "lucide-react";
import { renderPage, type OpenedDoc } from "@/lib/pdf-editor-render";
import { totalRotation, type PageState } from "@/lib/pdf-editor-state";
import { displaySize, type Rot } from "@/lib/pdf-editor-geometry";

interface Props {
  pages: PageState[];
  sources: Record<string, OpenedDoc>;
  selectedIds: string[];
  currentId: string | null;
  onToggle: (id: string) => void;
  onFocus: (id: string) => void;
  onRotate: (id: string, turns: 1 | -1) => void;
  onMove: (from: number, to: number) => void;
  onDelete: (id: string) => void;
}

/** Page thumbnails with checkboxes, reorder buttons and HTML5 drag-and-drop (desktop). */
export function PageList(props: Props) {
  const { pages, sources, selectedIds, currentId } = props;
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  return (
    <ol className="space-y-3" aria-label="Pages. Drag to reorder, or use the arrow buttons.">
      {pages.map((page, index) => (
        <li
          key={page.id}
          draggable
          onDragStart={(e: DragEvent<HTMLLIElement>) => { setDragIndex(index); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", String(index)); }}
          onDragOver={(e) => { e.preventDefault(); setOverIndex(index); }}
          onDragLeave={() => setOverIndex(null)}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null && dragIndex !== index) props.onMove(dragIndex, index);
            setDragIndex(null);
            setOverIndex(null);
          }}
          onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
          onClick={() => props.onFocus(page.id)}
          className={`rounded-xl border p-2 transition-colors ${
            currentId === page.id ? "border-cobalt bg-cobalt-wash" : "border-ink/10 bg-paper-raised"
          } ${overIndex === index && dragIndex !== null && dragIndex !== index ? "ring-2 ring-cobalt" : ""}`}
        >
          <div className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={selectedIds.includes(page.id)}
              onChange={() => props.onToggle(page.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select page ${index + 1}`}
              className="mt-1 h-4 w-4 accent-cobalt"
            />
            <Thumb page={page} doc={page.source === "blank" ? null : sources[page.source] ?? null} />
          </div>
          <div className="mt-2 flex items-center justify-between gap-1" onClick={(e) => e.stopPropagation()}>
            <span className="text-xs font-medium text-ink-soft">Page {index + 1}</span>
            <div className="flex gap-0.5">
              <IconBtn label={`Rotate page ${index + 1} left`} onClick={() => props.onRotate(page.id, -1)}><RotateCcw className="h-3.5 w-3.5" aria-hidden="true" /></IconBtn>
              <IconBtn label={`Rotate page ${index + 1} right`} onClick={() => props.onRotate(page.id, 1)}><RotateCw className="h-3.5 w-3.5" aria-hidden="true" /></IconBtn>
              <IconBtn label={`Move page ${index + 1} up`} disabled={index === 0} onClick={() => props.onMove(index, index - 1)}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></IconBtn>
              <IconBtn label={`Move page ${index + 1} down`} disabled={index === pages.length - 1} onClick={() => props.onMove(index, index + 1)}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></IconBtn>
              <IconBtn label={`Delete page ${index + 1}`} onClick={() => props.onDelete(page.id)}><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /></IconBtn>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="rounded-md p-1.5 text-ink-soft hover:bg-ink/5 disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt">
      {children}
    </button>
  );
}

function Thumb({ page, doc }: { page: PageState; doc: OpenedDoc | null }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const rot = totalRotation(page) as Rot;
  const size = displaySize({ w: page.view.w, h: page.view.h }, rot);
  const thumbW = 96;
  const scale = thumbW / Math.max(size.w, 1);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!doc || page.source === "blank") return;
    let cancelled = false;
    renderPage(doc.pdf, page.index + 1, rot, scale)
      .then((c) => {
        if (cancelled || !hostRef.current) return;
        c.style.width = "100%";
        c.style.height = "auto";
        c.style.display = "block";
        hostRef.current.replaceChildren(c);
        setReady(true);
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, [doc, page.index, page.source, rot, scale]);

  return (
    <div
      className="relative mx-auto flex items-center justify-center overflow-hidden rounded-md bg-white shadow-card"
      style={{ width: thumbW, aspectRatio: `${size.w} / ${size.h}` }}
    >
      <div ref={hostRef} className="h-full w-full" />
      {(!ready || page.source === "blank") && (
        <span className="absolute text-[10px] text-ink-mute">{page.source === "blank" ? "Blank" : "…"}</span>
      )}
    </div>
  );
}
