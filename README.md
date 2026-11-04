# Toolora

A free, all-in-one online tools platform built with Next.js (App Router), TypeScript,
Tailwind CSS and Lucide icons. All **39 tools** run in the browser. Files are processed on the
user's device and are not uploaded to Toolora's servers.

## Setup

```bash
npm ci                 # installs exactly what package-lock.json records
cp .env.example .env.local
npm test               # runs every test file (see Testing)
npm run typecheck
npm run build
npm run dev            # http://localhost:3000
```

Requires Node.js 18.18 or newer. Node 20 is pinned in `.nvmrc` for Vercel.
If the lockfile is absent, run `npm install` once and commit the file it creates.

## Configuration

Site settings come from environment variables (see `.env.example`). No API keys or secrets are used.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production URL for canonical links, sitemap and Open Graph |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Address the contact form opens in the visitor's mail app |
| `NEXT_PUBLIC_OPERATOR_NAME` | Legal operator named in Privacy and Terms |
| `NEXT_PUBLIC_GOVERNING_LAW` | Governing law stated in Terms |
| `NEXT_PUBLIC_SOCIAL_X` / `_LINKEDIN` / `_INSTAGRAM` | Optional footer links; empty values hide them |

## The 39 tools

Every tool is listed in `lib/tools.ts`, has a component registered in `components/tools/index.tsx`,
and is checked by `tests/registry.test.mts`. Each tool page has the tool, instructions, FAQs and
related tools. All 39 are labelled **Beta** because their logic is tested but their interfaces have
not yet been exercised in a real browser on Android, iPhone, tablet and desktop.

| Tool | Category | What it does | How it works |
| --- | --- | --- | --- |
| Image Compressor | Photo & Image | Shrink JPG, PNG and WebP files while keeping them sharp. | Client-side JavaScript |
| Image Resizer | Photo & Image | Set exact pixel dimensions or a percentage for any image. | Client-side JavaScript |
| Image Cropper | Photo & Image | Crop freely or to fixed ratios such as 1:1 and 16:9. | Canvas, in the browser. Drag the frame or type exact pixels. |
| Image Format Converter | Photo & Image | Convert images between JPG, PNG, WebP and more. | Client-side JavaScript |
| Passport Photo Maker | Photo & Image | Create passport and visa photos at official sizes. | Canvas at 300 dpi; 4 × 6 in print sheet. Framing is manual. |
| Background Remover | Photo & Image | Remove the background from a photo in one click. | @imgly/background-removal (WebAssembly model, downloaded once and cached by the browser). |
| Photo Enhancer | Photo & Image | Improve brightness, contrast and sharpness automatically. | Hand-written pixel pipeline: brightness, contrast, saturation, auto levels, unsharp mask. |
| Image to PDF | Photo & Image | Combine one or more images into a single PDF. | Client-side JavaScript |
| JPG to PNG | Photo & Image | Convert JPG photos to lossless PNG files. | Client-side JavaScript |
| PNG to JPG | Photo & Image | Convert PNG images to smaller JPG files. | Client-side JavaScript |
| PDF Merger | PDF & Documents | Join several PDFs into one file in the order you choose. | Client-side JavaScript |
| PDF Splitter | PDF & Documents | Split a PDF into separate files by page range. | Client-side JavaScript |
| PDF Compressor | PDF & Documents | Tidy up a PDF's structure to reduce its size. Best for text-based files. | Client-side JavaScript |
| PDF to JPG | PDF & Documents | Export each PDF page as a JPG image. | pdf.js rendering to canvas, 72–300 dpi, page range. |
| JPG to PDF | PDF & Documents | Turn JPG photos into a neatly formatted PDF. | Client-side JavaScript |
| PDF Page Rotator | PDF & Documents | Rotate individual or all pages of a PDF. | Client-side JavaScript |
| PDF Lock & Unlock | PDF & Documents | Add or remove a password on a PDF. | qpdf (WebAssembly): AES-256 encryption and decryption, in memory. |
| PDF Watermark | PDF & Documents | Stamp a text watermark across every page. | Client-side JavaScript |
| PDF Editor | PDF & Documents | Open, annotate, edit text, draw, insert images, reorder and rotate pages, merge PDFs, then export. | pdf.js display, pdf-lib export. Original pages are copied, annotations drawn on top; see the PDF Editor section. |
| PDF to Word | PDF & Documents | Convert PDF text into an editable Word document. | pdf.js text extraction to .docx. Text only; no OCR, so scanned PDFs are reported. |
| Professional Resume Builder | Career & Jobs | Fill in a guided form and download a clean, ATS-friendly resume. | Form and live preview; PDF (pdf-lib), Word (docx) and text copy. |
| Cover Letter Generator | Career & Jobs | Draft a tailored cover letter from your role and experience. | Template-based letter from your own sentences; PDF, Word and text copy. |
| CV Maker | Career & Jobs | Build a detailed academic or professional CV section by section. | Academic CV form; PDF, Word and text copy. |
| Resume Templates | Career & Jobs | Browse resume layouts and start from one that fits your field. | Three layouts with live samples; your choice carries into the builders. |
| Job Application Tracker | Career & Jobs | Track every application, status and follow-up date in one place. | Client-side JavaScript |
| CGPA Calculator | Student Tools | Work out your cumulative grade point average from subject credits. | Client-side JavaScript |
| Percentage Calculator | Student Tools | Calculate percentages from marks, totals or percentage changes. | Client-side JavaScript |
| GPA Calculator | Student Tools | Calculate semester GPA from letter grades and credit hours. | Client-side JavaScript |
| Marks Calculator | Student Tools | Total your marks across subjects and see your average. | Client-side JavaScript |
| Age Calculator | Student Tools | Find exact age in years, months and days. | Client-side JavaScript |
| Scientific Calculator | Student Tools | Run trigonometry, logarithms, powers and roots in one panel. | Client-side JavaScript |
| To-Do List | Productivity | Capture tasks, check them off and keep your list tidy. | Client-side JavaScript |
| Pomodoro Timer | Productivity | Work in focused 25-minute blocks with timed breaks. | Client-side JavaScript |
| Daily Planner | Productivity | Plan your day hour by hour with priorities. | Client-side JavaScript |
| Notes Manager | Productivity | Write, organise and search notes in your browser. | Client-side JavaScript |
| Kanban Board | Productivity | Move tasks across To Do, Doing and Done columns. | Client-side JavaScript |
| Word Counter | Productivity | Count words, characters, sentences and reading time instantly. | Client-side JavaScript |
| QR Code Generator | Productivity | Create a QR code from any link or text. | Client-side JavaScript |
| Password Generator | Productivity | Generate strong random passwords you choose the rules for. | Client-side JavaScript |

## PDF Editor

The PDF Editor opens a PDF, shows every page, and lets you change it. Pages are shown with pdf.js; the
edited file is written with pdf-lib.

**What it does**

- Opens PDFs and shows all pages as thumbnails and full pages; pages render lazily as you scroll.
- Add text boxes anywhere; choose font (sans, serif, mono), size, bold and colour for new text.
- Highlight, underline and strike through text. Click a line of existing text to mark it, or drag over any area.
- Edit existing text: click a line of text, then Replace it or Erase it (see the limits below).
- Freehand drawing with adjustable colour and brush size; rectangles, circles and ellipses (with optional fill); lines.
- Notes and comments: a yellow note box with text.
- Insert PNG or JPG images; drag to move them.
- Select and move any item; edit a selected text box or note; Delete removes it.
- Rotate pages left or right; reorder by dragging thumbnails (desktop) or with the arrow buttons (all devices, including touch).
- Delete selected pages (at least one page must remain); add a blank A4 or Letter page; merge another PDF onto the end.
- Undo and redo (up to 100 steps; Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y, and the toolbar buttons).
- Zoom from 50% to 300%.
- Export the edited PDF as a download.

**How the file is kept**

- Original pages are copied with `copyPages`, so their text, fonts and images are the same as before.
- Your additions are drawn on top as new content. They are not stored as separate annotation objects, so they
  cannot be edited again after export; re-open the exported file and add more if needed.
- Annotations are stored in the page's own (unrotated) coordinate space, so they rotate with the page.

**Limits of PDF editing (also shown inside the tool)**

- **Existing text cannot be rewritten in place.** PDFs store words as positioned glyphs in content streams, and
  browser tools cannot safely re-flow them. Replace and Erase cover the original words with a white box and place
  new text above. The original characters remain in the file, and copy or search tools can still find them. Use
  this for presentation changes, not for removing sensitive information. True redaction is not included.
- **Highlight, underline and strikethrough** on existing text are drawn as overlays on the original text.
- **New text** uses the three standard PDF fonts (Helvetica, Times, Courier). Text they cannot display, such
  as Devanagari or Chinese, is refused with a clear message. Custom font embedding is not included.
- **Sticky notes** are drawn as visible yellow boxes, not as PDF note icons.
- **Password-protected PDFs** cannot be opened. Unlock them with the PDF Lock & Unlock tool first.
- **Crop boxes:** the editor positions items using the page's crop box and writes them using its media box. These
  are the same for almost all PDFs. A PDF with a different crop box may show items slightly offset.
- **Interactive form fields and hyperlinks** are not checked in this release. Test them on your own forms.
- **Touch and drag:** thumbnails reorder by drag on desktop; on touch devices use the arrow buttons. Freehand
  drawing uses pointer events with touch-action disabled on the page, so it works with a finger or stylus.

## Processing and privacy

- Images use `createImageBitmap` and canvas `toBlob`.
- PDFs are created, merged, split, rotated, watermarked and edited with `pdf-lib`; read and rendered with `pdf.js`.
- Encryption uses qpdf compiled to WebAssembly (`@neslinesli93/qpdf-wasm`). Passwords stay in memory.
- Word output uses `docx`, which stores text as Unicode.
- Drafts (resume, CV, letter, to-do, notes, planner, kanban, tracker, pomodoro settings) are kept in
  localStorage. Clearing site data removes them.
- The background remover downloads its model the first time it runs. The download comes from the library's
  CDN, not from Toolora.

### Known limits of the other tools

- PDF output from the document tools uses standard fonts and cannot show Devanagari or Chinese. The Word download supports full Unicode.
- PDF to Word keeps text and paragraphs only. It does not keep fonts, columns, tables or images, and it does no OCR.
- PDF Compressor tidies the file structure but does not re-compress embedded photos.
- Passport photos are framed by hand. Check your country's rules.
- The cover letter generator arranges the sentences you write. It does not write them.

## Third-party components

| Package | Licence | Notes |
| --- | --- | --- |
| `pdf-lib` | MIT | PDF creation and editing |
| `pdfjs-dist` | Apache-2.0 | PDF reading and rendering |
| `docx` | MIT | Word output |
| `@neslinesli93/qpdf-wasm` | Apache-2.0 | qpdf for encryption |
| `@imgly/background-removal` | AGPL-3.0 | Background removal. Check whether AGPL obligations apply to your deployment before launch. |
| `qrcode` | MIT | QR codes |
| `lucide-react` | ISC | Icons |

## Testing

`npm test` runs `scripts/run-tests.mjs`, which runs each `tests/*.test.mts` file with Node's built-in
TypeScript support. There are 10 test files and 124 test cases in total.

- `tests/logic.test.mts` (22): validation, file rules, naming, dimensions, contact form.
- `tests/tools.test.mts` (30): percentage, GPA, marks, age, the safe expression parser, to-do, pomodoro, planner, kanban, notes, job tracker.
- `tests/dates-csv.test.mts` (5): local dates, CSV export with formula-injection protection, IDs.
- `tests/photo.test.mts` (16): crop geometry, passport sizes, print sheets, brightness, contrast, saturation, auto levels, sharpening.
- `tests/documents.test.mts` (14): resume, CV and letter validation and mapping; PDF and DOCX output checked by `qpdf --check`, pandoc and pdf.js.
- `tests/pdf.test.mts` (7): real qpdf encryption and decryption, wrong-password exit code, pdf.js text extraction, DOCX from extracted text.
- `tests/pdf-editor.test.mts` (15): page and annotation operations, undo and redo, export of every annotation type, and a **rasterised check**: a rectangle is exported at each of the four rotations, rendered with `pdftoppm`, and its measured position matches the geometry within 2 px.
- `tests/pdf-editor-geometry.test.mts` (6): the coordinate mapping checked against pdf.js's own viewport maths.
- `tests/pdf-editor-workflow.test.mts` (5): an end-to-end session on real PDFs: open and merge, reorder, rotate, delete, insert blank, annotate, edit, undo and redo, export, and a rendered-page check.
- `tests/registry.test.mts` (4): exactly 39 tools, each with a component and a valid status; no coming-soon notices.

Tests that need `qpdf`, `pandoc`, `pdftoppm` or `python3` (with Pillow) skip their external check when
the binary is absent, and the skip is visible in the output. The build environment had all four.

## Release status (read before deploying)

To produce a real, timestamped verification report on a machine with network access, run
`npm run verify:release`. It runs `npm install`, checks that `package-lock.json` exists, runs `npm ci` on a
clean copy, then `npm test`, `npm run typecheck` and `npm run build`, and writes `VERIFICATION-REPORT.md`
with the actual exit code of each command. It reports PASS only for exit code 0.

The report in this archive (`VERIFICATION-REPORT.md`) was produced in the build environment, which had no
registry access. It records every step as FAIL, which is the truth for that environment.


This release is a **release candidate, not a deployable build**. The items below are the real results
from the build environment. None of them was run against a working `node_modules`, and the public npm
registry was unreachable there.

| Check | Command | Result |
| --- | --- | --- |
| Unit and integration tests | `npm test` | **Passed**: 10 of 10 test files, 124 test cases, exit code 0. The three test-only packages (`pdf-lib` 1.17.1, `docx` 9.6.1, `pdfjs-dist` 5.6.205) were linked from a local copy. |
| TypeScript | `npm run typecheck` | **Failed** (exit code 2, 2,724 diagnostics). Most are caused by React, Next.js and lucide types not being installed. A few real errors were fixed (pdf.js page types, Next's CSS typings). Re-run after `npm install`. |
| Production build | `npm run build` | **Not run to completion** (exit code 127: `next` is not installed in the build environment). |
| Lockfile | `package-lock.json` | **Missing.** It must be generated with `npm install` on a machine with registry access, then committed. `npm ci` will fail until it exists. |
| Registry existence of every version | — | **Not verified.** Only `pdf-lib`, `docx` and `pdfjs-dist` are confirmed, because they were installed earlier from the registry. `@neslinesli93/qpdf-wasm` (`^0.7.0`) and `@imgly/background-removal` (`^1.5.0`) must be checked on first install. |
| Tool registration | `tests/registry.test.mts` | **Passed**: 39 tools, each with a component; no coming-soon or planned wording in the UI. |

Before deployment, on a machine with network access:

1. `npm install` (creates the lockfile), then commit `package-lock.json`.
2. `npm ci` on a clean copy, to confirm the lockfile installs.
3. `npm test`, `npm run typecheck`, `npm run build`. Fix anything that fails.
4. Open every tool in a real browser on Android, iPhone, a tablet and a desktop.

Any tool that fails in a real browser should be fixed before it is described as working.

## Two coordinate modules

`lib/pdf-editor-geometry.ts` is the one the editor uses. `lib/pdf-editor/geometry.ts` was present in the
project before this release, is tested separately, and implements the same mapping under other names. Both
are tested and agree. Consolidating them is a sensible cleanup after the first build.

## Deployment (GitHub and Vercel)

1. Run `npm install` and commit `package.json` and `package-lock.json`.
2. Set the variables from `.env.example` in Vercel's project settings.
3. Vercel detects Next.js and runs `npm run build`.
4. Before going live: test every tool on real phones and tablets, have a lawyer review the Privacy Policy, Terms, and the AGPL position of the background remover.
