import type { Metadata } from "next";
import { PageShell } from "@/components/page-shell";
import { ContactForm } from "@/components/contact-form";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Report a bug, request a tool or ask a question about Toolora.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <PageShell
      title="Contact us"
      intro="Found a bug, want a tool added, or have a question about your files? Send us a note."
    >
      <ContactForm />
      <p className="text-sm text-ink-mute">
        {SITE.contactEmail
          ? <>You can also write to <a href={`mailto:${SITE.contactEmail}`}>{SITE.contactEmail}</a> directly.</>
          : "Email contact is not yet configured for this site."}
      </p>
      <p className="text-sm text-ink-mute">
        Messages are sent from your own email app, so they are subject to that provider&apos;s privacy terms.
        Please don&apos;t send files that contain sensitive personal data.
      </p>
    </PageShell>
  );
}
