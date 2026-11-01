# Toolora

A premium all-in-one online tools platform built with Next.js (App Router),
TypeScript, Tailwind CSS and Lucide icons.

## Setup

The archive does not include `package-lock.json` or `node_modules`. The first
`npm install` creates the lockfile; commit it so deployments are reproducible.

```bash
npm install
cp .env.example .env.local   # then edit your domain and contact details
npm run dev                  # http://localhost:3000
```

Other scripts:

- `npm run build` – production build (run this before every deploy)
- `npm run typecheck` – TypeScript check without emitting files
- `npm test` – unit tests for pure logic (page ranges, file validation, dimensions, contact validation)

## Configuration

All site-wide settings live in `lib/site.ts` and read from environment variables:

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Production URL used for canonical links, sitemap and Open Graph |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Address the contact form opens in the visitor's mail app |
| `NEXT_PUBLIC_OPERATOR_NAME` | Legal operator name shown in Privacy and Terms |
| `NEXT_PUBLIC_SOCIAL_*` | Optional social links; empty values hide the link |

## Project structure

```
app/
  layout.tsx               Root layout, fonts, SEO metadata, header/footer
  page.tsx                 Homepage: hero, directory, popular, recent, FAQ
  about/ contact/ privacy/ terms/   Static information pages
  tools/[slug]/page.tsx    Tool page generated from the registry
  sitemap.ts robots.ts     SEO routes using SITE.url
  not-found.tsx            Custom 404
components/
  site-header.tsx          Responsive navigation with mobile menu
  site-footer.tsx          Footer
  tool-directory.tsx       Client search + category filter
  tool-card.tsx            Reusable card with status badge
  page-shell.tsx           Shared layout for information pages
  contact-form.tsx         Validated contact form
  tools/                   One component per tool
    shared/                FileDropzone, status messages, ResultRow
    index.tsx              Slug -> component registry
lib/
  tools.ts                 Single source of truth for every tool
  site.ts                  Environment-driven site config
  files.ts                 Validation, byte formatting, output names, dimension maths (pure)
  page-ranges.ts           PDF page range parser (pure)
  contact.ts               Contact validation (pure)
  image.ts                 Canvas decode/resize/encode helpers (browser)
  pdf.ts                   pdf-lib operations (browser)
  download.ts              Blob download helper (browser)
tests/logic.test.mts       Unit tests for pure modules
```

## Tool status

Each tool in `lib/tools.ts` has one of three statuses:

- **ready** – fully implemented and tested. Currently none. Mark a tool ready only after its functionality has been tested in a real browser.
- **beta** – implemented and running, but not yet fully verified in a browser on every device.
- **planned** – listed on the site with a "Coming soon" notice. Its page does not offer a working interface.

Only tools with a registered component can be beta or ready.

## Processing and privacy

Every implemented tool runs in the browser. Files are read with the File API and
processed with:

- Canvas API – image compression, resizing, format conversion (`lib/image.ts`)
- `pdf-lib` – images to PDF, merge, split, structural optimisation (`lib/pdf.ts`)
- `qrcode` – QR code generation (loaded on demand)

PDF to Word is not reliable fully in the browser. When it is built it will need a
server-side conversion service, exposed through a Route Handler such as
`app/api/convert/route.ts`. Until then it stays planned.

The PDF compressor only optimises the PDF's internal structure. It does not
re-compress embedded images, so image-heavy PDFs will shrink very little. Its
page says so.

## Adding a tool

1. Set its entry in `lib/tools.ts` to `status: "beta"` once the component exists.
2. Build the component in `components/tools/your-tool.tsx` as a client component
   (`"use client"`), reusing `FileDropzone`, `BusyStatus`, `ErrorStatus`, `ResultRow`.
3. Put any pure logic in `lib/` with no imports, and add tests in `tests/`.
4. Register the component in `components/tools/index.tsx`.

## Before launch

- Have a qualified lawyer review the Privacy Policy and Terms. They are drafts
  describing the current code, not legal advice.
- Confirm the governing law in the Terms (section 8 is still a placeholder).
- Set `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_CONTACT_EMAIL` and `NEXT_PUBLIC_OPERATOR_NAME`.
- If you add analytics or advertising, update the Privacy Policy first.
- Test every beta tool on desktop and mobile browsers, then change its status.
- Add dark mode (class-based, with a toggle stored in localStorage) if you still want it.
- Add per-tool Open Graph images.
