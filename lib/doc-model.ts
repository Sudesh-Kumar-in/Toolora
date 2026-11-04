/**
 * Document model shared by Resume Builder, CV Maker, Cover Letter Generator and
 * Resume Templates. The form-to-model mapping and validation are pure and tested.
 * No imports.
 */

export type TemplateId = "classic" | "modern" | "minimal";

export interface TemplateStyle {
  id: TemplateId;
  label: string;
  description: string;
  font: "Times-Roman" | "Helvetica";
  fontBold: "Times-Bold" | "Helvetica-Bold";
  accent: [number, number, number];
  accentHex: string;
  docxFont: string;
  uppercaseHeadings: boolean;
  headingRule: boolean;
}

export const TEMPLATES: Record<TemplateId, TemplateStyle> = {
  classic: {
    id: "classic",
    label: "Classic",
    description: "Traditional serif type with ruled section headings. Suits law, finance, academia and formal roles.",
    font: "Times-Roman",
    fontBold: "Times-Bold",
    accent: [0.07, 0.09, 0.13],
    accentHex: "#101820",
    docxFont: "Times New Roman",
    uppercaseHeadings: true,
    headingRule: true,
  },
  modern: {
    id: "modern",
    label: "Modern",
    description: "Clean sans-serif with a blue accent. Suits tech, design, marketing and startups.",
    font: "Helvetica",
    fontBold: "Helvetica-Bold",
    accent: [0.17, 0.31, 1],
    accentHex: "#2B4EFF",
    docxFont: "Arial",
    uppercaseHeadings: false,
    headingRule: false,
  },
  minimal: {
    id: "minimal",
    label: "Minimal",
    description: "Quiet grey tones and lots of white space. Suits any field where you want the content to lead.",
    font: "Helvetica",
    fontBold: "Helvetica-Bold",
    accent: [0.35, 0.38, 0.42],
    accentHex: "#5B6672",
    docxFont: "Calibri",
    uppercaseHeadings: false,
    headingRule: false,
  },
};

export function getTemplate(id: string | null | undefined): TemplateStyle {
  return (id && id in TEMPLATES ? TEMPLATES[id as TemplateId] : TEMPLATES.classic);
}

export interface DocEntry {
  title: string;
  subtitle?: string;
  dates?: string;
  bullets?: string[];
}

export interface DocSection {
  heading: string;        // empty string = no heading
  entries?: DocEntry[];
  lines?: string[];       // plain paragraphs
}

export interface DocModel {
  name: string;
  headline: string;
  contact: string[];
  sections: DocSection[];
}

/* ---------- validation helpers ---------- */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^\+?[\d\s()\-]{6,20}$/;

export function isValidEmail(v: string): boolean {
  return EMAIL.test(v.trim());
}

export function splitLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

export function splitList(text: string): string[] {
  return text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean);
}

/* ---------- resume ---------- */

export interface ExperienceForm {
  role: string;
  company: string;
  place: string;
  start: string;
  end: string;
  current: boolean;
  bullets: string;
}

export interface EducationForm {
  degree: string;
  school: string;
  year: string;
  details: string;
}

export interface ResumeForm {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  summary: string;
  experience: ExperienceForm[];
  education: EducationForm[];
  skills: string;
  certifications: string;
}

export const EMPTY_RESUME: ResumeForm = {
  fullName: "", headline: "", email: "", phone: "", location: "", website: "", summary: "",
  experience: [], education: [], skills: "", certifications: "",
};

export function validateResume(f: ResumeForm): string | null {
  if (!f.fullName.trim()) return "Enter your full name.";
  if (!isValidEmail(f.email)) return "Enter a valid email address.";
  if (f.phone.trim() && !PHONE.test(f.phone.trim())) return "The phone number contains characters that are not allowed.";
  if (f.website.trim() && !/^https?:\/\/\S+$/i.test(f.website.trim()) && !/^[\w.-]+\.[a-z]{2,}(\/\S*)?$/i.test(f.website.trim()))
    return "Enter a website such as https://yourname.com.";
  for (const [i, e] of f.experience.entries()) {
    const any = e.role || e.company || e.start || e.bullets;
    if (!any) continue;
    if (!e.role.trim()) return `Experience ${i + 1}: enter the job title.`;
    if (!e.company.trim()) return `Experience ${i + 1}: enter the company.`;
    if (!e.start.trim()) return `Experience ${i + 1}: enter a start date.`;
    if (!e.current && !e.end.trim()) return `Experience ${i + 1}: enter an end date or tick “I currently work here”.`;
  }
  for (const [i, e] of f.education.entries()) {
    if (!e.degree.trim() && !e.school.trim() && !e.year.trim()) continue;
    if (!e.degree.trim()) return `Education ${i + 1}: enter the degree or qualification.`;
    if (!e.school.trim()) return `Education ${i + 1}: enter the school or university.`;
  }
  if (!f.summary.trim() && f.experience.every((e) => !e.role.trim()) && f.education.every((e) => !e.degree.trim()))
    return "Add a summary, at least one job, or at least one qualification.";
  return null;
}

export function resumeToDoc(f: ResumeForm): DocModel {
  const contact = [f.location, f.email, f.phone, f.website].map((s) => s.trim()).filter(Boolean);
  const sections: DocSection[] = [];

  if (f.summary.trim()) sections.push({ heading: "Summary", lines: splitLines(f.summary) });

  const experience = f.experience.filter((e) => e.role.trim());
  if (experience.length) {
    sections.push({
      heading: "Experience",
      entries: experience.map((e) => ({
        title: e.role.trim(),
        subtitle: [e.company.trim(), e.place.trim()].filter(Boolean).join(" · "),
        dates: `${e.start.trim()} – ${e.current ? "Present" : e.end.trim()}`,
        bullets: splitLines(e.bullets),
      })),
    });
  }

  const education = f.education.filter((e) => e.degree.trim());
  if (education.length) {
    sections.push({
      heading: "Education",
      entries: education.map((e) => ({
        title: e.degree.trim(),
        subtitle: e.school.trim(),
        dates: e.year.trim(),
        bullets: splitLines(e.details),
      })),
    });
  }

  const skills = splitList(f.skills);
  if (skills.length) sections.push({ heading: "Skills", lines: [skills.join(" · ")] });

  const certs = splitLines(f.certifications);
  if (certs.length) sections.push({ heading: "Certifications", lines: certs });

  return { name: f.fullName.trim(), headline: f.headline.trim(), contact, sections };
}

/* ---------- CV (academic) ---------- */

export interface CvForm {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  affiliation: string;
  researchInterests: string;
  education: { degree: string; institution: string; year: string }[];
  positions: { title: string; institution: string; years: string }[];
  publications: string;
  teaching: string;
  awards: string;
}

export const EMPTY_CV: CvForm = {
  fullName: "", title: "", email: "", phone: "", affiliation: "", researchInterests: "",
  education: [], positions: [], publications: "", teaching: "", awards: "",
};

export function validateCv(f: CvForm): string | null {
  if (!f.fullName.trim()) return "Enter your full name.";
  if (!isValidEmail(f.email)) return "Enter a valid email address.";
  if (f.phone.trim() && !PHONE.test(f.phone.trim())) return "The phone number contains characters that are not allowed.";
  for (const [i, e] of f.education.entries()) {
    if (!e.degree.trim() && !e.institution.trim() && !e.year.trim()) continue;
    if (!e.degree.trim() || !e.institution.trim()) return `Education ${i + 1}: enter the degree and the institution.`;
  }
  for (const [i, p] of f.positions.entries()) {
    if (!p.title.trim() && !p.institution.trim() && !p.years.trim()) continue;
    if (!p.title.trim() || !p.institution.trim()) return `Position ${i + 1}: enter the title and the institution.`;
  }
  const hasContent = f.researchInterests.trim() || f.education.some((e) => e.degree.trim()) ||
    f.positions.some((p) => p.title.trim()) || f.publications.trim();
  if (!hasContent) return "Add your research interests, a qualification, a position or a publication.";
  return null;
}

export function cvToDoc(f: CvForm): DocModel {
  const contact = [f.affiliation, f.email, f.phone].map((s) => s.trim()).filter(Boolean);
  const sections: DocSection[] = [];

  if (f.researchInterests.trim()) sections.push({ heading: "Research interests", lines: [splitList(f.researchInterests).join(" · ")] });

  const edu = f.education.filter((e) => e.degree.trim());
  if (edu.length) sections.push({
    heading: "Education",
    entries: edu.map((e) => ({ title: e.degree.trim(), subtitle: e.institution.trim(), dates: e.year.trim() })),
  });

  const pos = f.positions.filter((p) => p.title.trim());
  if (pos.length) sections.push({
    heading: "Academic positions",
    entries: pos.map((p) => ({ title: p.title.trim(), subtitle: p.institution.trim(), dates: p.years.trim() })),
  });

  const pubs = splitLines(f.publications);
  if (pubs.length) sections.push({ heading: "Publications", lines: pubs.map((p, i) => `${i + 1}. ${p}`) });

  const teaching = splitLines(f.teaching);
  if (teaching.length) sections.push({ heading: "Teaching", lines: teaching });

  const awards = splitLines(f.awards);
  if (awards.length) sections.push({ heading: "Awards and grants", lines: awards });

  return { name: f.fullName.trim(), headline: f.title.trim(), contact, sections };
}

/* ---------- Cover letter ---------- */

export interface CoverForm {
  yourName: string;
  email: string;
  phone: string;
  letterDate: string;     // YYYY-MM-DD
  recipientName: string;
  company: string;
  roleTitle: string;
  opening: string;
  achievement: string;
  whyCompany: string;
  closing: string;
}

export const EMPTY_COVER: CoverForm = {
  yourName: "", email: "", phone: "", letterDate: "", recipientName: "", company: "",
  roleTitle: "", opening: "", achievement: "", whyCompany: "", closing: "",
};

export const DEFAULT_CLOSING = "Thank you for considering my application. I would welcome the chance to discuss how I can contribute to your team.";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function formatLetterDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${day} ${MONTHS[month - 1]} ${m[1]}`;
}

export function validateCover(f: CoverForm): string | null {
  if (!f.yourName.trim()) return "Enter your name.";
  if (!isValidEmail(f.email)) return "Enter a valid email address.";
  if (!f.company.trim()) return "Enter the company name.";
  if (!f.roleTitle.trim()) return "Enter the job title you are applying for.";
  if (!formatLetterDate(f.letterDate)) return "Choose the date for the letter.";
  for (const [label, text] of [["Opening", f.opening], ["Key achievement", f.achievement], ["Why this company", f.whyCompany]] as const) {
    if (text.trim().length < 20) return `${label}: write at least 20 characters so the letter says something specific.`;
  }
  return null;
}

export function coverToDoc(f: CoverForm): DocModel {
  const salutation = f.recipientName.trim() ? `Dear ${f.recipientName.trim()},` : "Dear Hiring Manager,";
  const paragraphs = [
    `I am writing to apply for the ${f.roleTitle.trim()} position at ${f.company.trim()}. ${f.opening.trim()}`,
    f.achievement.trim(),
    f.whyCompany.trim(),
    f.closing.trim() || DEFAULT_CLOSING,
  ];
  const lines: string[] = [formatLetterDate(f.letterDate)];
  if (f.recipientName.trim()) lines.push(f.recipientName.trim());
  lines.push(f.company.trim(), "", salutation, ...paragraphs, "", "Sincerely,", f.yourName.trim());

  return {
    name: f.yourName.trim(),
    headline: "",
    contact: [f.email, f.phone].map((s) => s.trim()).filter(Boolean),
    sections: [{ heading: "", lines }],
  };
}

/** Plain text version of any document, for the copy button. */
export function docToPlainText(doc: DocModel): string {
  const out: string[] = [];
  out.push(doc.name);
  if (doc.headline) out.push(doc.headline);
  if (doc.contact.length) out.push(doc.contact.join(" | "));
  for (const s of doc.sections) {
    out.push("");
    if (s.heading) out.push(s.heading.toUpperCase());
    for (const e of s.entries ?? []) {
      out.push([e.title, e.subtitle].filter(Boolean).join(", ") + (e.dates ? ` (${e.dates})` : ""));
      for (const b of e.bullets ?? []) out.push(`• ${b}`);
    }
    for (const l of s.lines ?? []) out.push(l);
  }
  return out.join("\n");
}

/** Sample content for the Resume Templates gallery. Clearly fictional. */
export const SAMPLE_RESUME: ResumeForm = {
  fullName: "Alex Morgan",
  headline: "Product Designer",
  email: "alex.morgan@example.com",
  phone: "+1 555 010 2030",
  location: "Austin, TX",
  website: "alexmorgan.example.com",
  summary: "Product designer with six years of experience turning complex workflows into simple, accessible products.",
  experience: [
    {
      role: "Senior Product Designer", company: "Brightline", place: "Remote", start: "2022", end: "", current: true,
      bullets: "Led redesign of the onboarding flow, lifting activation by 24%\nRan research with 40 customers each quarter",
    },
    {
      role: "Product Designer", company: "Fieldwork Studio", place: "Austin, TX", start: "2019", end: "2022", current: false,
      bullets: "Designed a scheduling tool used by 3,000 field technicians",
    },
  ],
  education: [{ degree: "BA Visual Communication", school: "State University", year: "2015–2019", details: "" }],
  skills: "Figma, User research, Prototyping, Accessibility (WCAG), Design systems",
  certifications: "",
};
