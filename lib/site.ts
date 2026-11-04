/**
 * Central site configuration. Values come from environment variables so the
 * same code can be deployed to any domain without edits.
 *
 *   NEXT_PUBLIC_SITE_URL   Production URL, e.g. https://toolora.app (no trailing slash)
 *   NEXT_PUBLIC_CONTACT_EMAIL  Address shown on the contact page
 */

const rawUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000";

export const SITE = {
  name: "Toolora",
  url: rawUrl.replace(/\/+$/, ""),
  description:
    "Free online tools for photos, PDFs, careers, students and productivity. Files are processed in your browser wherever possible.",
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || "",
  /** Leave a URL empty to hide that link in the footer. */
  social: [
    { label: "X (Twitter)", href: process.env.NEXT_PUBLIC_SOCIAL_X?.trim() || "" },
    { label: "LinkedIn", href: process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN?.trim() || "" },
    { label: "Instagram", href: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM?.trim() || "" },
  ].filter((s) => s.href.length > 0),
  /** Governing law stated in the Terms. Set NEXT_PUBLIC_GOVERNING_LAW to your jurisdiction. */
  governingLaw: process.env.NEXT_PUBLIC_GOVERNING_LAW?.trim() || "the laws of the country in which the operator is registered",
  /** Legal entity shown in Terms and Privacy. Replace before launch. */
  operatorName: process.env.NEXT_PUBLIC_OPERATOR_NAME?.trim() || "the Toolora team",
  lastUpdated: "1 November 2026",
} as const;
