import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";

export const metadata: Metadata = {
  title: "About",
  description: "What Toolora is, how it handles your files, and what we are building next.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <PageShell
      title="About Toolora"
      intro="Toolora brings the everyday tools people search for into one calm, fast workspace: photos, PDFs, job applications, student maths and productivity."
    >
      <h2>Why we built it</h2>
      <p>
        Most small utilities live on separate websites, each with its own
        advertising, sign-up wall and upload queue. Toolora puts them in one
        place with a consistent design, so you can find a tool quickly and
        trust how it behaves.
      </p>

      <h2>How your files are handled</h2>
      <p>
        Where a tool can work on your device, it does. Image and PDF tools
        read and write files inside your browser, so the file itself is not
        sent to us. Each tool page states how its data is handled. Read the
        full detail in our <Link href="/privacy">privacy policy</Link>.
      </p>

      <h2>What we are building next</h2>
      <p>
        Tools are released in stages. Those marked <em>Beta</em> work today and
        are still being tested. Those marked <em>Coming soon</em> are on the
        roadmap but do not run yet. We will not label a tool as finished until
        it has been tested.
      </p>

      <h2>Get in touch</h2>
      <p>
        Found a bug or have a tool you want? Visit the{" "}
        <Link href="/contact">contact page</Link>.
      </p>
    </PageShell>
  );
}
