/**
 * Document model for the PDF Editor. Pure functions only: every edit returns a new object,
 * which makes undo and redo simple. No imports.
 */

export type StandardFontName = "Helvetica" | "Times-Roman" | "Courier";

interface AnnBase { id: string; color: string }

export type Annotation =
  | (AnnBase & { kind: "text"; x: number; y: number; text: string; size: number; font: StandardFontName; bold: boolean })
  | (AnnBase & { kind: "cover"; x: number; y: number; w: number; h: number })
  | (AnnBase & { kind: "highlight" | "underline" | "strike"; x: number; y: number; w: number; h: number })
  | (AnnBase & { kind: "ink"; points: { x: number; y: number }[]; width: number })
  | (AnnBase & { kind: "rect" | "ellipse"; x: number; y: number; w: number; h: number; width: number; fill: boolean })
  | (AnnBase & { kind: "line"; x1: number; y1: number; x2: number; y2: number; width: number })
  | (AnnBase & { kind: "note"; x: number; y: number; text: string })
  | (AnnBase & { kind: "image"; x: number; y: number; w: number; h: number; assetId: string });

export interface PageState {
  id: string;
  /** "blank" for pages added in the editor, otherwise the id of a source document. */
  source: string;
  /** 0-based index of the page inside its source document. */
  index: number;
  /** Unrotated page size in PDF points (media box). */
  view: { w: number; h: number };
  /** Rotation already in the source page (/Rotate), 0/90/180/270. */
  baseRotation: number;
  /** Rotation the user has added in the editor, in multiples of 90. */
  userRotation: number;
  anns: Annotation[];
}

export interface SourceDoc {
  id: string;
  name: string;
  pageCount: number;
}

export interface EditorDoc {
  sources: SourceDoc[];
  pages: PageState[];
}

export const EMPTY_DOC: EditorDoc = { sources: [], pages: [] };

export const PAGE_SIZES = {
  A4: { w: 595.28, h: 841.89 },
  Letter: { w: 612, h: 792 },
} as const;

export function totalRotation(p: PageState): number {
  return (((p.baseRotation + p.userRotation) % 360) + 360) % 360;
}

export function findPage(doc: EditorDoc, pageId: string): PageState | undefined {
  return doc.pages.find((p) => p.id === pageId);
}

function mapPage(doc: EditorDoc, pageId: string, fn: (p: PageState) => PageState): EditorDoc {
  return { ...doc, pages: doc.pages.map((p) => (p.id === pageId ? fn(p) : p)) };
}

/* ---- page operations ---- */

export function rotatePage(doc: EditorDoc, pageId: string, quarterTurns: 1 | -1): EditorDoc {
  return mapPage(doc, pageId, (p) => ({ ...p, userRotation: (((p.userRotation + quarterTurns * 90) % 360) + 360) % 360 }));
}

export function movePage(doc: EditorDoc, fromIndex: number, toIndex: number): EditorDoc {
  if (fromIndex === toIndex) return doc;
  if (fromIndex < 0 || fromIndex >= doc.pages.length || toIndex < 0 || toIndex >= doc.pages.length) return doc;
  const pages = [...doc.pages];
  const [moved] = pages.splice(fromIndex, 1);
  pages.splice(toIndex, 0, moved);
  return { ...doc, pages };
}

/** Deletes pages. Refuses to delete every page, because an empty document cannot be saved. */
export function deletePages(doc: EditorDoc, pageIds: string[]): { doc: EditorDoc; error: string | null } {
  const remaining = doc.pages.filter((p) => !pageIds.includes(p.id));
  if (remaining.length === 0) return { doc, error: "A PDF must keep at least one page. Add a page first, then delete this one." };
  return { doc: { ...doc, pages: remaining }, error: null };
}

export function insertBlankPage(doc: EditorDoc, afterIndex: number, size: { w: number; h: number }, id: string): EditorDoc {
  const page: PageState = { id, source: "blank", index: 0, view: size, baseRotation: 0, userRotation: 0, anns: [] };
  const at = Math.min(Math.max(afterIndex + 1, 0), doc.pages.length);
  const pages = [...doc.pages];
  pages.splice(at, 0, page);
  return { ...doc, pages };
}

export function appendSource(
  doc: EditorDoc,
  source: SourceDoc,
  pages: { id: string; index: number; view: { w: number; h: number }; baseRotation: number }[],
): EditorDoc {
  return {
    sources: [...doc.sources, source],
    pages: [
      ...doc.pages,
      ...pages.map((p) => ({ id: p.id, source: source.id, index: p.index, view: p.view, baseRotation: p.baseRotation, userRotation: 0, anns: [] as Annotation[] })),
    ],
  };
}

/* ---- annotation operations ---- */

export function addAnnotation(doc: EditorDoc, pageId: string, ann: Annotation): EditorDoc {
  return mapPage(doc, pageId, (p) => ({ ...p, anns: [...p.anns, ann] }));
}

export function updateAnnotation(doc: EditorDoc, pageId: string, annId: string, patch: Partial<Annotation>): EditorDoc {
  return mapPage(doc, pageId, (p) => ({
    ...p,
    anns: p.anns.map((a) => (a.id === annId ? ({ ...a, ...patch } as Annotation) : a)),
  }));
}

export function removeAnnotation(doc: EditorDoc, pageId: string, annId: string): EditorDoc {
  return mapPage(doc, pageId, (p) => ({ ...p, anns: p.anns.filter((a) => a.id !== annId) }));
}

/* ---- history (undo / redo) ---- */

export interface History<T> {
  past: T[];
  present: T;
  future: T[];
}

export const HISTORY_LIMIT = 100;

export function createHistory<T>(present: T): History<T> {
  return { past: [], present, future: [] };
}

export function commit<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  const past = [...h.past, h.present];
  if (past.length > HISTORY_LIMIT) past.shift();
  return { past, present: next, future: [] };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  const previous = h.past[h.past.length - 1];
  return { past: h.past.slice(0, -1), present: previous, future: [h.present, ...h.future] };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  const [next, ...rest] = h.future;
  return { past: [...h.past, h.present], present: next, future: rest };
}

export function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Shifts an annotation by (dx, dy) in VIEW points. Used by drag-to-move. */
export function translateAnnotation(a: Annotation, dx: number, dy: number): Annotation {
  switch (a.kind) {
    case "line":
      return { ...a, x1: a.x1 + dx, y1: a.y1 + dy, x2: a.x2 + dx, y2: a.y2 + dy };
    case "ink":
      return { ...a, points: a.points.map((p) => ({ x: p.x + dx, y: p.y + dy })) };
    default:
      return { ...a, x: a.x + dx, y: a.y + dy } as Annotation;
  }
}

/** Bounding box of an annotation in VIEW space. Notes use their fixed width and an estimated height. */
export function annotationBounds(a: Annotation): { x: number; y: number; w: number; h: number } {
  switch (a.kind) {
    case "line":
      return { x: Math.min(a.x1, a.x2), y: Math.min(a.y1, a.y2), w: Math.abs(a.x2 - a.x1), h: Math.abs(a.y2 - a.y1) };
    case "ink": {
      const xs = a.points.map((p) => p.x);
      const ys = a.points.map((p) => p.y);
      const x = Math.min(...xs);
      const y = Math.min(...ys);
      return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
    }
    case "text": {
      const lines = a.text.split("\n");
      const longest = Math.max(1, ...lines.map((l) => l.length));
      return { x: a.x, y: a.y, w: longest * a.size * 0.6, h: lines.length * a.size * 1.2 };
    }
    case "note": {
      const lines = a.text.split("\n").length;
      return { x: a.x, y: a.y, w: 180, h: Math.max(40, lines * 12.5 + 10) };
    }
    default:
      return { x: a.x, y: a.y, w: (a as { w: number }).w, h: (a as { h: number }).h };
  }
}
