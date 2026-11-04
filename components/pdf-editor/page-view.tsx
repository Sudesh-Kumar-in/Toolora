"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { displayRectOfView, displaySize, displayToView, viewToDisplay, type Point, type Rot } from "@/lib/pdf-editor-geometry";
import { annotationBounds, newId, translateAnnotation, type Annotation, type PageState } from "@/lib/pdf-editor-state";
import { renderPage, type OpenedDoc, type TextRect } from "@/lib/pdf-editor-render";

export type Tool =
  | "select" | "text" | "edit-text" | "highlight" | "underline" | "strike"
  | "draw" | "rect" | "ellipse" | "line" | "note";

export interface Style {
  color: string;
  highlightColor: string;
  font: "Helvetica" | "Times-Roman" | "Courier";
  size: number;
  bold: boolean;
  brush: number;
  strokeWidth: number;
  fill: boolean;
}

interface Props {
  page: PageState;
  pageNumber: number;
  opened: OpenedDoc | null;
  zoom: number;
  tool: Tool;
  style: Style;
  selectedAnnId: string | null;
  textRects: TextRect[] | null;
  imageUrls: Record<string, string>;
  onActivate: () => void;
  onSelectAnn: (id: string | null) => void;
  onAdd: (ann: Annotation) => void;
  onMove: (annId: string, dx: number, dy: number) => void;
  onNeedText: () => void;
  onTextHit: (rect: TextRect, tool: Tool) => void;
  onEditText: (rect: TextRect) => void;
}

const TEXT_TOOLS: Tool[] = ["edit-text", "highlight", "underline", "strike"];
const DRAG_TOOLS: Tool[] = ["highlight", "underline", "strike", "draw", "rect", "ellipse", "line"];

type Draft = { start: Point; cur: Point; points: Point[] };

export function PageView(props: Props) {
  const { page, pageNumber, opened, zoom, tool, style, selectedAnnId, textRects, imageUrls } = props;
  const rot: Rot = ((((page.baseRotation + page.userRotation) % 360) + 360) % 360) as Rot;
  const view = useMemo(() => ({ w: page.view.w, h: page.view.h }), [page.view.w, page.view.h]);
  const disp = displaySize(view, rot);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [visible, setVisible] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [moving, setMoving] = useState<{ id: string; start: Point; cur: Point; moved: boolean; ann: Annotation } | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  // Render lazily: only pages near the viewport are drawn, so long documents stay responsive.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) setVisible(true);
    }, { rootMargin: "600px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Draw the page canvas at the current zoom and rotation.
  useEffect(() => {
    if (!visible || !opened || page.source === "blank") return;
    let cancelled = false;
    const host = wrapRef.current?.querySelector("[data-canvas-host]") as HTMLElement | null;
    if (!host) return;
    renderPage(opened.pdf, page.index + 1, rot, zoom * 1.5)
      .then((canvas) => {
        if (cancelled) return;
        canvas.style.width = "100%";
        canvas.style.height = "100%";
        canvas.style.display = "block";
        host.replaceChildren(canvas);
        setRenderError(null);
      })
      .catch(() => { if (!cancelled) setRenderError("This page could not be drawn."); });
    return () => { cancelled = true; };
  }, [visible, opened, page.index, page.source, rot, zoom]);

  // Load selectable text when a text-based tool is active.
  useEffect(() => {
    if (TEXT_TOOLS.includes(tool) && textRects === null && visible) props.onNeedText();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool, visible, textRects]);

  function toView(e: ReactPointerEvent<SVGSVGElement> | PointerEvent): Point {
    const box = svgRef.current!.getBoundingClientRect();
    const sx = (e.clientX - box.left) * (disp.w / box.width);
    const sy = (e.clientY - box.top) * (disp.h / box.height);
    return displayToView({ x: sx, y: sy }, view, rot);
  }

  function hitText(p: Point): TextRect | undefined {
    return textRects?.find((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
  }

  function onBackgroundDown(e: ReactPointerEvent<SVGSVGElement>) {
    props.onActivate();
    const p = toView(e);
    if (tool === "select") {
      props.onSelectAnn(null);
      return;
    }
    if (tool === "text" || tool === "note") {
      const id = newId("a");
      const base = { id, x: p.x, y: p.y, color: tool === "note" ? "#FFE066" : style.color };
      const ann: Annotation = tool === "note"
        ? { ...base, kind: "note", text: "Note", color: "#FFE066" }
        : { ...base, kind: "text", text: "Text", size: style.size, font: style.font, bold: style.bold };
      props.onAdd(ann);
      props.onSelectAnn(id);
      return;
    }
    if (DRAG_TOOLS.includes(tool)) {
      svgRef.current?.setPointerCapture(e.pointerId);
      setDraft({ start: p, cur: p, points: [p] });
    }
  }

  function onPointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (moving) {
      const p = toView(e);
      const moved = moving.moved || Math.hypot(p.x - moving.start.x, p.y - moving.start.y) > 2;
      setMoving({ ...moving, cur: p, moved });
      return;
    }
    if (!draft) return;
    const p = toView(e);
    setDraft({ ...draft, cur: p, points: tool === "draw" ? [...draft.points, p] : draft.points });
  }

  function onPointerUp(e: ReactPointerEvent<SVGSVGElement>) {
    if (moving) {
      if (moving.moved) props.onMove(moving.id, moving.cur.x - moving.start.x, moving.cur.y - moving.start.y);
      setMoving(null);
      return;
    }
    if (!draft) return;
    const p = toView(e);
    const dist = Math.hypot(p.x - draft.start.x, p.y - draft.start.y);
    const a = draft.start;
    const b = p;
    const box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    setDraft(null);

    if (tool === "highlight" || tool === "underline" || tool === "strike") {
      if (dist < 3) {
        const hit = hitText(a);
        if (hit) props.onTextHit(hit, tool);
        return;
      }
      props.onAdd({
        id: newId("a"), kind: tool, ...box,
        color: tool === "highlight" ? style.highlightColor : style.color,
      });
      return;
    }
    if (dist < 2) return;
    if (tool === "rect" || tool === "ellipse") {
      props.onAdd({ id: newId("a"), kind: tool, ...box, width: style.strokeWidth, fill: style.fill, color: style.color });
      return;
    }
    if (tool === "line") {
      props.onAdd({ id: newId("a"), kind: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: style.strokeWidth, color: style.color });
      return;
    }
    if (tool === "draw") {
      const pts = draft.points.length > 1 ? draft.points : [a, b];
      props.onAdd({ id: newId("a"), kind: "ink", points: pts, width: style.brush, color: style.color });
    }
  }

  function onAnnDown(e: ReactPointerEvent<SVGElement>, ann: Annotation) {
    if (tool !== "select") return;
    e.stopPropagation();
    props.onSelectAnn(ann.id);
    const p = toView(e as unknown as ReactPointerEvent<SVGSVGElement>);
    svgRef.current?.setPointerCapture(e.pointerId);
    setMoving({ id: ann.id, start: p, cur: p, moved: false, ann });
  }

  // Preview of the shape being drawn, shown with the same renderer as saved annotations.
  const draftAnn = useMemo<Annotation | null>(() => {
    if (!draft) return null;
    const a = draft.start;
    const b = draft.cur;
    const box = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), w: Math.abs(b.x - a.x), h: Math.abs(b.y - a.y) };
    const id = "draft";
    switch (tool) {
      case "highlight": return { id, kind: "highlight", ...box, color: style.highlightColor };
      case "underline": return { id, kind: "underline", ...box, color: style.color };
      case "strike": return { id, kind: "strike", ...box, color: style.color };
      case "rect": return { id, kind: "rect", ...box, width: style.strokeWidth, fill: style.fill, color: style.color };
      case "ellipse": return { id, kind: "ellipse", ...box, width: style.strokeWidth, fill: style.fill, color: style.color };
      case "line": return { id, kind: "line", x1: a.x, y1: a.y, x2: b.x, y2: b.y, width: style.strokeWidth, color: style.color };
      case "draw": return { id, kind: "ink", points: draft.points, width: style.brush, color: style.color };
      default: return null;
    }
  }, [draft, tool, style]);

  const annotations = page.anns;
  const moveDelta = moving && moving.moved ? { dx: moving.cur.x - moving.start.x, dy: moving.cur.y - moving.start.y } : null;

  return (
    <div
      ref={wrapRef}
      className="relative mx-auto select-none rounded-lg bg-white shadow-card"
      style={{ width: disp.w * zoom, height: disp.h * zoom, maxWidth: "none" }}
      onPointerDown={() => props.onActivate()}
      data-page-number={pageNumber}
      aria-label={`Page ${pageNumber}`}
    >
      <div data-canvas-host className="absolute inset-0 overflow-hidden rounded-lg bg-white">
        {page.source === "blank" && (
          <div className="flex h-full items-center justify-center text-sm text-ink-mute">Blank page</div>
        )}
        {!visible && page.source !== "blank" && (
          <div className="flex h-full items-center justify-center text-sm text-ink-mute">Loading page {pageNumber}…</div>
        )}
        {renderError && <div className="flex h-full items-center justify-center text-sm text-red-700">{renderError}</div>}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${disp.w} ${disp.h}`}
        width={disp.w * zoom}
        height={disp.h * zoom}
        className="absolute inset-0 touch-none"
        style={{ cursor: tool === "select" ? "default" : "crosshair" }}
        onPointerDown={onBackgroundDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label={`Editing layer for page ${pageNumber}. ${annotations.length} items.`}
      >
        {annotations.map((ann) => {
          const shown = moveDelta && moving?.id === ann.id ? translateAnnotation(ann, moveDelta.dx, moveDelta.dy) : ann;
          return (
            <AnnotationShape
              key={ann.id}
              ann={shown}
              view={view}
              rot={rot}
              imageUrl={ann.kind === "image" ? imageUrls[ann.assetId] : undefined}
              interactive={tool === "select"}
              onDown={(e) => onAnnDown(e, ann)}
            />
          );
        })}
        {draftAnn && <AnnotationShape ann={draftAnn} view={view} rot={rot} interactive={false} />}

        {selectedAnnId && annotations.some((a) => a.id === selectedAnnId) && (() => {
          const ann = annotations.find((a) => a.id === selectedAnnId)!;
          const shown = moveDelta && moving?.id === ann.id ? translateAnnotation(ann, moveDelta.dx, moveDelta.dy) : ann;
          const b = displayRectOfView(annotationBounds(shown), view, rot);
          return <rect x={b.x - 2} y={b.y - 2} width={b.w + 4} height={b.h + 4} fill="none" stroke="#2B4EFF" strokeDasharray="4 3" strokeWidth={1} pointerEvents="none" />;
        })()}

        {TEXT_TOOLS.includes(tool) && textRects && textRects.map((r, i) => {
          const b = displayRectOfView(r, view, rot);
          const clickable = tool === "edit-text";
          return (
            <rect
              key={i}
              x={b.x} y={b.y} width={b.w} height={b.h}
              fill="transparent"
              stroke="transparent"
              className={clickable ? "hover:fill-cobalt/10 hover:stroke-cobalt" : ""}
              pointerEvents={clickable ? "visiblePainted" : "none"}
              onPointerDown={clickable ? (e) => { e.stopPropagation(); props.onEditText(r); } : undefined}
            >
              <title>{r.str}</title>
            </rect>
          );
        })}
      </svg>
    </div>
  );
}

function AnnotationShape({
  ann, view, rot, imageUrl, interactive, onDown,
}: {
  ann: Annotation;
  view: { w: number; h: number };
  rot: Rot;
  imageUrl?: string;
  interactive: boolean;
  onDown?: (e: ReactPointerEvent<SVGElement>) => void;
}) {
  const pe = interactive ? "visiblePainted" : "none";
  const common = { pointerEvents: pe as "visiblePainted" | "none", onPointerDown: interactive ? onDown : undefined };

  switch (ann.kind) {
    case "cover": {
      const b = displayRectOfView(ann, view, rot);
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#FFFFFF" {...common} />;
    }
    case "highlight": {
      const b = displayRectOfView(ann, view, rot);
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={ann.color} opacity={0.4} {...common} />;
    }
    case "underline":
    case "strike": {
      const b = displayRectOfView(ann, view, rot);
      const y = ann.kind === "underline" ? b.y + b.h : b.y + b.h / 2;
      return <line x1={b.x} x2={b.x + b.w} y1={y} y2={y} stroke={ann.color} strokeWidth={1.4} {...common} />;
    }
    case "rect": {
      const b = displayRectOfView(ann, view, rot);
      return <rect x={b.x} y={b.y} width={b.w} height={b.h} fill={ann.fill ? ann.color : "none"} stroke={ann.color} strokeWidth={ann.width} {...common} />;
    }
    case "ellipse": {
      const b = displayRectOfView(ann, view, rot);
      return <ellipse cx={b.x + b.w / 2} cy={b.y + b.h / 2} rx={b.w / 2} ry={b.h / 2} fill={ann.fill ? ann.color : "none"} stroke={ann.color} strokeWidth={ann.width} {...common} />;
    }
    case "line": {
      const a = viewToDisplay({ x: ann.x1, y: ann.y1 }, view, rot);
      const b = viewToDisplay({ x: ann.x2, y: ann.y2 }, view, rot);
      return <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={ann.color} strokeWidth={ann.width} strokeLinecap="round" {...common} />;
    }
    case "ink": {
      const pts = ann.points.map((p) => viewToDisplay(p, view, rot)).map((p) => `${p.x},${p.y}`).join(" ");
      return <polyline points={pts} fill="none" stroke={ann.color} strokeWidth={ann.width} strokeLinecap="round" strokeLinejoin="round" {...common} />;
    }
    case "text": {
      const p = viewToDisplay({ x: ann.x, y: ann.y }, view, rot);
      const lines = ann.text.split("\n");
      const family = ann.font === "Times-Roman" ? "Times New Roman, serif" : ann.font === "Courier" ? "Courier New, monospace" : "Arial, Helvetica, sans-serif";
      return (
        <text
          x={p.x} y={p.y}
          transform={`rotate(${rot} ${p.x} ${p.y})`}
          fontSize={ann.size}
          fontFamily={family}
          fontWeight={ann.bold ? "bold" : "normal"}
          fill={ann.color}
          dominantBaseline="hanging"
          {...common}
        >
          {lines.map((l, i) => <tspan key={i} x={p.x} dy={i === 0 ? 0 : ann.size * 1.2}>{l || " "}</tspan>)}
        </text>
      );
    }
    case "note": {
      const b = displayRectOfView(annotationBounds(ann), view, rot);
      const p = viewToDisplay({ x: ann.x + 5, y: ann.y + 5 }, view, rot);
      const lines = ann.text.split("\n");
      return (
        <g {...common}>
          <rect x={b.x} y={b.y} width={b.w} height={b.h} fill="#FFE066" stroke="#7a6a1a" strokeWidth={0.8} />
          <text x={p.x} y={p.y} transform={`rotate(${rot} ${p.x} ${p.y})`} fontSize={10} fontFamily="Arial, Helvetica, sans-serif" fill="#1a1a1a" dominantBaseline="hanging">
            {lines.map((l, i) => <tspan key={i} x={p.x} dy={i === 0 ? 0 : 12.5}>{l || " "}</tspan>)}
          </text>
        </g>
      );
    }
    case "image": {
      const b = displayRectOfView(ann, view, rot);
      if (!imageUrl) return null;
      return <image href={imageUrl} x={b.x} y={b.y} width={b.w} height={b.h} preserveAspectRatio="none" {...common} />;
    }
  }
}
