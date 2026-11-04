/**
 * Single source of truth for every tool on the platform.
 * Every tool listed here must have a component registered in components/tools/index.tsx.
 * tests/registry.test.mts enforces that.
 */

export type CategoryId = "photo" | "pdf" | "career" | "student" | "productivity";
export type ToolStatus = "ready" | "beta";

export type IconKey =
  | "minimize"
  | "maximize"
  | "crop"
  | "convert"
  | "idCard"
  | "eraser"
  | "sparkles"
  | "fileText"
  | "fileImage"
  | "fileOutput"
  | "files"
  | "scissors"
  | "rotate"
  | "lock"
  | "droplets"
  | "briefcase"
  | "pen"
  | "clipboard"
  | "layers"
  | "checklist"
  | "graduation"
  | "percent"
  | "calculator"
  | "calendar"
  | "timer"
  | "notebook"
  | "columns"
  | "type"
  | "qr"
  | "key";

export interface ToolDef {
  slug: string;
  name: string;
  description: string;
  category: CategoryId;
  icon: IconKey;
  keywords: string[];
  status: ToolStatus;
  popular?: boolean;
  addedAt: string; // ISO date, used for "Recently added"
}

export const CATEGORIES: { id: CategoryId | "all"; label: string }[] = [
  { id: "all", label: "All Tools" },
  { id: "photo", label: "Photo & Image" },
  { id: "pdf", label: "PDF & Documents" },
  { id: "career", label: "Career & Jobs" },
  { id: "student", label: "Student Tools" },
  { id: "productivity", label: "Productivity" },
];

export const CATEGORY_LABEL: Record<CategoryId, string> = {
  photo: "Photo & Image",
  pdf: "PDF & Documents",
  career: "Career & Jobs",
  student: "Student Tools",
  productivity: "Productivity",
};

export const TOOLS: ToolDef[] = [
  // Photo & Image
  { slug: "image-compressor", name: "Image Compressor", description: "Shrink JPG, PNG and WebP files while keeping them sharp.", category: "photo", icon: "minimize", keywords: ["compress", "reduce size", "jpg", "png", "webp"], status: "beta", popular: true, addedAt: "2026-02-10" },
  { slug: "image-resizer", name: "Image Resizer", description: "Set exact pixel dimensions or a percentage for any image.", category: "photo", icon: "maximize", keywords: ["resize", "dimensions", "pixels", "scale"], status: "beta", addedAt: "2026-02-10" },
  { slug: "image-cropper", name: "Image Cropper", description: "Crop freely or to fixed ratios such as 1:1 and 16:9.", category: "photo", icon: "crop", keywords: ["crop", "trim", "aspect ratio"], status: "beta", addedAt: "2026-02-10" },
  { slug: "image-converter", name: "Image Format Converter", description: "Convert images between JPG, PNG, WebP and more.", category: "photo", icon: "convert", keywords: ["convert", "format", "webp", "image"], status: "beta", addedAt: "2026-02-18" },
  { slug: "passport-photo-maker", name: "Passport Photo Maker", description: "Create passport and visa photos at official sizes.", category: "photo", icon: "idCard", keywords: ["passport", "visa", "id photo"], status: "beta", addedAt: "2026-03-02" },
  { slug: "background-remover", name: "Background Remover", description: "Remove the background from a photo in one click.", category: "photo", icon: "eraser", keywords: ["transparent", "cutout", "remove background"], status: "beta", popular: true, addedAt: "2026-03-02" },
  { slug: "photo-enhancer", name: "Photo Enhancer", description: "Improve brightness, contrast and sharpness automatically.", category: "photo", icon: "sparkles", keywords: ["enhance", "sharpen", "brightness", "contrast"], status: "beta", addedAt: "2026-03-14" },
  { slug: "image-to-pdf", name: "Image to PDF", description: "Combine one or more images into a single PDF.", category: "photo", icon: "fileText", keywords: ["pdf", "images", "convert"], status: "beta", addedAt: "2026-03-14" },
  { slug: "jpg-to-png", name: "JPG to PNG", description: "Convert JPG photos to lossless PNG files.", category: "photo", icon: "convert", keywords: ["jpg", "png", "convert"], status: "beta", addedAt: "2026-02-10" },
  { slug: "png-to-jpg", name: "PNG to JPG", description: "Convert PNG images to smaller JPG files.", category: "photo", icon: "convert", keywords: ["png", "jpg", "convert"], status: "beta", addedAt: "2026-02-10" },

  // PDF & Documents
  { slug: "pdf-merger", name: "PDF Merger", description: "Join several PDFs into one file in the order you choose.", category: "pdf", icon: "files", keywords: ["merge", "combine", "join", "pdf"], status: "beta", popular: true, addedAt: "2026-02-10" },
  { slug: "pdf-splitter", name: "PDF Splitter", description: "Split a PDF into separate files by page range.", category: "pdf", icon: "scissors", keywords: ["split", "separate", "pages", "extract"], status: "beta", addedAt: "2026-02-10" },
  { slug: "pdf-compressor", name: "PDF Compressor", description: "Tidy up a PDF's structure to reduce its size. Best for text-based files.", category: "pdf", icon: "minimize", keywords: ["compress", "size", "pdf", "email"], status: "beta", popular: true, addedAt: "2026-02-10" },
  { slug: "pdf-to-jpg", name: "PDF to JPG", description: "Export each PDF page as a JPG image.", category: "pdf", icon: "fileImage", keywords: ["pdf", "jpg", "convert", "pages"], status: "beta", addedAt: "2026-02-18" },
  { slug: "jpg-to-pdf", name: "JPG to PDF", description: "Turn JPG photos into a neatly formatted PDF.", category: "pdf", icon: "fileText", keywords: ["jpg", "pdf", "convert"], status: "beta", addedAt: "2026-02-18" },
  { slug: "pdf-page-rotator", name: "PDF Page Rotator", description: "Rotate individual or all pages of a PDF.", category: "pdf", icon: "rotate", keywords: ["rotate", "turn", "pages", "pdf"], status: "beta", addedAt: "2026-03-02" },
  { slug: "pdf-lock-unlock", name: "PDF Lock & Unlock", description: "Add or remove a password on a PDF.", category: "pdf", icon: "lock", keywords: ["password", "protect", "encrypt", "unlock"], status: "beta", addedAt: "2026-03-02" },
  { slug: "pdf-watermark", name: "PDF Watermark", description: "Stamp a text watermark across every page.", category: "pdf", icon: "droplets", keywords: ["watermark", "stamp", "pdf", "confidential"], status: "beta", addedAt: "2026-03-14" },
  { slug: "pdf-editor", name: "PDF Editor", description: "Open, annotate, edit text, draw, insert images, reorder and rotate pages, merge PDFs, then export.", category: "pdf", icon: "pen", keywords: ["pdf editor", "annotate", "edit pdf", "highlight", "sign", "draw", "comment", "reorder pages", "merge"], status: "beta", addedAt: "2026-11-02" },
  { slug: "pdf-to-word", name: "PDF to Word", description: "Convert PDF text into an editable Word document.", category: "pdf", icon: "fileOutput", keywords: ["word", "docx", "convert", "editable"], status: "beta", addedAt: "2026-03-14" },

  // Career & Jobs
  { slug: "resume-builder", name: "Professional Resume Builder", description: "Fill in a guided form and download a clean, ATS-friendly resume.", category: "career", icon: "briefcase", keywords: ["resume", "cv", "builder", "job"], status: "beta", popular: true, addedAt: "2026-04-01" },
  { slug: "cover-letter-generator", name: "Cover Letter Generator", description: "Draft a tailored cover letter from your role and experience.", category: "career", icon: "pen", keywords: ["cover letter", "application", "job"], status: "beta", addedAt: "2026-04-01" },
  { slug: "cv-maker", name: "CV Maker", description: "Build a detailed academic or professional CV section by section.", category: "career", icon: "clipboard", keywords: ["cv", "curriculum vitae", "academic"], status: "beta", addedAt: "2026-04-10" },
  { slug: "resume-templates", name: "Resume Templates", description: "Browse resume layouts and start from one that fits your field.", category: "career", icon: "layers", keywords: ["resume", "template", "design"], status: "beta", addedAt: "2026-04-10" },
  { slug: "job-application-tracker", name: "Job Application Tracker", description: "Track every application, status and follow-up date in one place.", category: "career", icon: "checklist", keywords: ["job", "tracker", "applications", "pipeline"], status: "beta", addedAt: "2026-04-22" },

  // Student Tools
  { slug: "cgpa-calculator", name: "CGPA Calculator", description: "Work out your cumulative grade point average from subject credits.", category: "student", icon: "graduation", keywords: ["cgpa", "grade", "gpa", "credits", "university"], status: "beta", popular: true, addedAt: "2026-02-10" },
  { slug: "percentage-calculator", name: "Percentage Calculator", description: "Calculate percentages from marks, totals or percentage changes.", category: "student", icon: "percent", keywords: ["percentage", "marks", "percent"], status: "beta", addedAt: "2026-02-10" },
  { slug: "gpa-calculator", name: "GPA Calculator", description: "Calculate semester GPA from letter grades and credit hours.", category: "student", icon: "graduation", keywords: ["gpa", "semester", "grades", "credit hours"], status: "beta", addedAt: "2026-02-18" },
  { slug: "marks-calculator", name: "Marks Calculator", description: "Total your marks across subjects and see your average.", category: "student", icon: "calculator", keywords: ["marks", "total", "average", "exam"], status: "beta", addedAt: "2026-02-18" },
  { slug: "age-calculator", name: "Age Calculator", description: "Find exact age in years, months and days.", category: "student", icon: "calendar", keywords: ["age", "birthday", "date", "years"], status: "beta", addedAt: "2026-09-28" },
  { slug: "scientific-calculator", name: "Scientific Calculator", description: "Run trigonometry, logarithms, powers and roots in one panel.", category: "student", icon: "calculator", keywords: ["scientific", "calculator", "math", "trig"], status: "beta", addedAt: "2026-03-02" },

  // Productivity
  { slug: "todo-list", name: "To-Do List", description: "Capture tasks, check them off and keep your list tidy.", category: "productivity", icon: "checklist", keywords: ["todo", "tasks", "checklist"], status: "beta", addedAt: "2026-02-10" },
  { slug: "pomodoro-timer", name: "Pomodoro Timer", description: "Work in focused 25-minute blocks with timed breaks.", category: "productivity", icon: "timer", keywords: ["pomodoro", "focus", "timer", "break"], status: "beta", popular: true, addedAt: "2026-02-18" },
  { slug: "daily-planner", name: "Daily Planner", description: "Plan your day hour by hour with priorities.", category: "productivity", icon: "calendar", keywords: ["planner", "schedule", "day"], status: "beta", addedAt: "2026-03-02" },
  { slug: "notes-manager", name: "Notes Manager", description: "Write, organise and search notes in your browser.", category: "productivity", icon: "notebook", keywords: ["notes", "memo", "write"], status: "beta", addedAt: "2026-03-14" },
  { slug: "kanban-board", name: "Kanban Board", description: "Move tasks across To Do, Doing and Done columns.", category: "productivity", icon: "columns", keywords: ["kanban", "board", "tasks", "agile"], status: "beta", addedAt: "2026-10-05" },
  { slug: "word-counter", name: "Word Counter", description: "Count words, characters, sentences and reading time instantly.", category: "productivity", icon: "type", keywords: ["word count", "characters", "text", "reading time"], status: "beta", popular: true, addedAt: "2026-02-10" },
  { slug: "qr-code-generator", name: "QR Code Generator", description: "Create a QR code from any link or text.", category: "productivity", icon: "qr", keywords: ["qr", "qr code", "barcode", "link"], status: "beta", addedAt: "2026-10-12" },
  { slug: "password-generator", name: "Password Generator", description: "Generate strong random passwords you choose the rules for.", category: "productivity", icon: "key", keywords: ["password", "random", "secure", "generator"], status: "beta", addedAt: "2026-02-10" },
];

export function getTool(slug: string): ToolDef | undefined {
  return TOOLS.find((t) => t.slug === slug);
}

export function getPopularTools(limit = 4): ToolDef[] {
  return TOOLS.filter((t) => t.popular).slice(0, limit);
}

export function getRecentTools(limit = 4): ToolDef[] {
  return [...TOOLS]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, limit);
}

export function getRelatedTools(slug: string, limit = 3): ToolDef[] {
  const current = getTool(slug);
  if (!current) return [];
  const sameCategory = TOOLS.filter(
    (t) => t.category === current.category && t.slug !== slug,
  );
  return sameCategory.slice(0, limit);
}

/** Case-insensitive match on name, description, keywords and category label. */
export function searchTools(
  query: string,
  category: CategoryId | "all" = "all",
): ToolDef[] {
  const q = query.trim().toLowerCase();
  return TOOLS.filter((tool) => {
    if (category !== "all" && tool.category !== category) return false;
    if (!q) return true;
    const haystack = [
      tool.name,
      tool.description,
      CATEGORY_LABEL[tool.category],
      ...tool.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return q.split(/\s+/).every((term) => haystack.includes(term));
  });
}
