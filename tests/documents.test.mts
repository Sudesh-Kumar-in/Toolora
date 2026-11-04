// Run with: node --experimental-strip-types tests/documents.test.mts
// Requires node_modules/pdf-lib, docx, pdfjs-dist (npm install in the real project).
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { Packer } from "docx";
import { PDFDocument } from "pdf-lib";
import {
  TEMPLATES, validateResume, resumeToDoc, validateCv, cvToDoc, validateCover, coverToDoc,
  formatLetterDate, docToPlainText, splitList, EMPTY_RESUME, EMPTY_COVER, getTemplate,
  type ResumeForm, type CvForm, type CoverForm,
} from "../lib/doc-model.ts";
import { renderDocPdf, UnsupportedCharacterError, wrapText } from "../lib/render-pdf.ts";
import { buildDocx } from "../lib/render-docx.ts";

let passed = 0;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "toolora-doc-"));
const hasBin = (b: string) => { try { execFileSync("which", [b], { stdio: "pipe" }); return true; } catch { return false; } };
const test = (name: string, fn: () => void | Promise<void>) => ({ name, fn });

const sampleResume: ResumeForm = {
  ...EMPTY_RESUME,
  fullName: "Ada Lovelace",
  headline: "Software Engineer",
  email: "ada@example.com",
  phone: "+44 20 7946 0000",
  location: "London, UK",
  website: "https://ada.example.com",
  summary: "Engineer who writes precise, well-tested code.\nLoves compilers and analytical engines.",
  experience: [
    { role: "Senior Engineer", company: "Analytical Co", place: "London", start: "2020", end: "", current: true,
      bullets: "Led a team of four\nCut build times by 40%" },
    { role: "Engineer", company: "Babbage Ltd", place: "", start: "2016", end: "2020", current: false, bullets: "Built the parser" },
  ],
  education: [{ degree: "BSc Mathematics", school: "University of London", year: "2012–2015", details: "First-class honours" }],
  skills: "TypeScript, Python, SQL",
  certifications: "AWS Certified Developer",
};

const tests = [
  test("resume validation accepts a complete form", () => {
    assert.equal(validateResume(sampleResume), null);
  }),
  test("resume validation reports missing name, bad email and incomplete job", () => {
    assert.match(validateResume({ ...sampleResume, fullName: "" })!, /full name/);
    assert.match(validateResume({ ...sampleResume, email: "nope" })!, /email/);
    assert.match(validateResume({ ...sampleResume, experience: [{ ...sampleResume.experience[0], start: "" }] })!, /start date/);
    assert.match(validateResume({ ...sampleResume, experience: [{ ...sampleResume.experience[1], end: "", current: false }] })!, /end date/);
  }),
  test("resume validation rejects a page with no content", () => {
    assert.match(validateResume({ ...EMPTY_RESUME, fullName: "A", email: "a@b.co" })!, /Add a summary/);
  }),
  test("resume maps to a document with the right sections", () => {
    const d = resumeToDoc(sampleResume);
    assert.deepEqual(d.sections.map((s) => s.heading), ["Summary", "Experience", "Education", "Skills", "Certifications"]);
    assert.equal(d.sections[1].entries![0].dates, "2020 – Present");
    assert.deepEqual(d.sections[1].entries![0].bullets, ["Led a team of four", "Cut build times by 40%"]);
    assert.ok(d.contact.includes("ada@example.com"));
  }),
  test("CV validation and mapping", () => {
    const cv: CvForm = {
      fullName: "Dr Grace Hopper", title: "Associate Professor", email: "grace@uni.example", phone: "",
      affiliation: "Dept of Computing", researchInterests: "compilers, programming languages",
      education: [{ degree: "PhD Mathematics", institution: "Yale", year: "1934" }],
      positions: [{ title: "Professor", institution: "Harvard", years: "1950–1966" }],
      publications: "A paper on compilers\nA paper on languages", teaching: "Intro to COBOL", awards: "Distinguished Service Award",
    };
    assert.equal(validateCv(cv), null);
    const d = cvToDoc(cv);
    assert.deepEqual(d.sections.map((s) => s.heading), ["Research interests", "Education", "Academic positions", "Publications", "Teaching", "Awards and grants"]);
    assert.equal(d.sections[3].lines![0], "1. A paper on compilers");
    assert.match(validateCv({ ...cv, positions: [{ title: "", institution: "X", years: "" }] })!, /Position 1/);
    assert.match(validateCv({ ...cv, researchInterests: "", education: [], positions: [], publications: "" })!, /Add your research/);
  }),
  test("cover letter validation and composition", () => {
    const cover: CoverForm = {
      ...EMPTY_COVER, yourName: "Sam Rivera", email: "sam@example.com", letterDate: "2026-11-02",
      recipientName: "Jordan Lee", company: "Northwind", roleTitle: "Product Designer",
      opening: "I have spent six years designing tools for small businesses.",
      achievement: "I redesigned checkout and increased conversions by 18 percent.",
      whyCompany: "Your commitment to accessible design matches how I work.", closing: "",
    };
    assert.equal(validateCover(cover), null);
    assert.match(validateCover({ ...cover, opening: "short" })!, /Opening/);
    assert.match(validateCover({ ...cover, letterDate: "2026-13-40" })!, /date/);
    assert.equal(formatLetterDate("2026-11-02"), "2 November 2026");
    const d = coverToDoc(cover);
    const text = docToPlainText(d);
    assert.match(text, /Dear Jordan Lee,/);
    assert.match(text, /apply for the Product Designer position at Northwind/);
    assert.match(text, /Sincerely,\nSam Rivera/);
    assert.match(text, /Thank you for considering/);
  }),
  test("splitList and wrapText basics", () => {
    assert.deepEqual(splitList("a, b\nc,, "), ["a", "b", "c"]);
    assert.equal(getTemplate("nope").id, "classic");
    assert.equal(Object.keys(TEMPLATES).length, 3);
  }),
  test("PDF renderer produces a valid PDF that contains the text", async () => {
    const bytes = await renderDocPdf(resumeToDoc(sampleResume), TEMPLATES.classic);
    const reread = await PDFDocument.load(bytes);
    assert.ok(reread.getPageCount() >= 1);
    const file = path.join(tmp, "resume.pdf");
    fs.writeFileSync(file, bytes);
    if (hasBin("qpdf")) execFileSync("qpdf", ["--check", file], { stdio: "pipe" });
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false }).promise;
    let text = "";
    for (let i = 1; i <= doc.numPages; i++) {
      const tc = await (await doc.getPage(i)).getTextContent();
      text += tc.items.map((it: { str: string }) => it.str).join(" ") + "\n";
    }
    assert.match(text, /Ada Lovelace/);
    assert.match(text, /Led a team of four/);
    assert.match(text, /TypeScript/);
  }),
  test("PDF renderer paginates long documents", async () => {
    const long: ResumeForm = { ...sampleResume, summary: Array.from({ length: 120 }, (_, i) => `Line ${i} of a very long summary paragraph.`).join("\n") };
    const bytes = await renderDocPdf(resumeToDoc(long), TEMPLATES.modern);
    assert.ok((await PDFDocument.load(bytes)).getPageCount() >= 2);
  }),
  test("PDF renderer refuses scripts that standard fonts cannot display, with a clear message", async () => {
    await assert.rejects(
      renderDocPdf(resumeToDoc({ ...sampleResume, fullName: "नमस्ते" }), TEMPLATES.minimal),
      (err: unknown) => err instanceof UnsupportedCharacterError && /docx/i.test(err.message),
    );
  }),
  test("all three templates render", async () => {
    for (const t of Object.values(TEMPLATES)) {
      const bytes = await renderDocPdf(resumeToDoc(sampleResume), t);
      assert.ok(bytes.length > 500, t.id);
    }
  }),
  test("DOCX builds, packs to a valid zip and reads back via pandoc", async () => {
    const buf = await Packer.toBuffer(buildDocx(resumeToDoc(sampleResume), TEMPLATES.modern));
    const file = path.join(tmp, "resume.docx");
    fs.writeFileSync(file, buf);
    assert.equal(buf.subarray(0, 2).toString(), "PK");
    if (hasBin("pandoc")) {
      const out = execFileSync("pandoc", [file, "-t", "plain"], { encoding: "utf8" });
      assert.match(out, /Ada Lovelace/);
      assert.match(out, /Cut build times by 40%/);
      assert.match(out, /TypeScript/);
    }
  }),
  test("DOCX keeps non-Latin text", async () => {
    const buf = await Packer.toBuffer(buildDocx(resumeToDoc({ ...sampleResume, fullName: "नमस्ते Ada" }), TEMPLATES.classic));
    const file = path.join(tmp, "unicode.docx");
    fs.writeFileSync(file, buf);
    if (hasBin("pandoc")) {
      const out = execFileSync("pandoc", [file, "-t", "plain"], { encoding: "utf8" });
      assert.match(out, /नमस्ते Ada/);
    }
  }),
  test("wrapText wraps on words, breaks long words, and keeps every line within width", () => {
    // Fixed-width fake font: every character is 10 units wide at size 1.
    const font = { widthOfTextAtSize: (t: string, size: number) => t.length * 10 * size } as unknown as Parameters<typeof wrapText>[1];
    const lines = wrapText("the quick brown fox", font, 1, 100);
    assert.deepEqual(lines, ["the quick", "brown fox"]);
    const long = wrapText("abcdefghijklmnop", font, 1, 50);
    assert.deepEqual(long, ["abcde", "fghij", "klmno", "p"]);
    for (const line of [...lines, ...long]) assert.ok(line.length * 10 <= 100);
    assert.deepEqual(wrapText("a\n\nb", font, 1, 100), ["a", "", "b"]);
  }),
];

let failures = 0;
for (const t of tests) {
  try {
    await t.fn();
    passed++;
    console.log(`ok - ${t.name}`);
  } catch (err) {
    failures++;
    console.log(`not ok - ${t.name}\n   ${(err as Error).message}`);
  }
}
console.log(`\n${passed} passed, ${failures} failed`);
if (failures) process.exit(1);
