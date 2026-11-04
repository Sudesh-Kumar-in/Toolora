import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms for using Toolora's free online tools.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <PageShell
      title="Terms & conditions"
      meta={`Last updated ${SITE.lastUpdated}`}
      intro="These terms apply whenever you use Toolora. Please read them alongside our privacy policy."
    >
      <h2>1. Using Toolora</h2>
      <p>
        Toolora provides free tools that you may use for personal and
        commercial purposes, subject to these terms. You must be old enough to
        form a binding contract in your region, or use Toolora under the
        supervision of a parent or guardian.
      </p>

      <h2>2. Acceptable use</h2>
      <p>You agree not to use Toolora to:</p>
      <ul>
        <li>process content you do not have the right to use or edit;</li>
        <li>create or distribute anything unlawful, including malware or content that exploits children;</li>
        <li>attempt to disrupt, reverse engineer or overload the service.</li>
      </ul>

      <h2>3. Your files and results</h2>
      <p>
        You keep all rights in the files and text you process. You are
        responsible for checking that your output is accurate and suitable
        before you rely on it, sending it to someone or submitting it to an
        organisation.
      </p>

      <h2>4. Results are estimates</h2>
      <p>
        Calculators such as CGPA and percentage tools apply standard formulas.
        Your university or employer may use different rules, so check results
        against official records. Résumé and cover-letter tools support your
        writing but do not replace professional career advice.
      </p>

      <h2>5. No warranty</h2>
      <p>
        Toolora is provided &quot;as is&quot; and &quot;as available&quot;.
        We work to keep tools accurate and available, but we do not promise
        that they will be error-free, uninterrupted or suitable for any
        particular purpose. Keep a backup of important files.
      </p>

      <h2>6. Limitation of liability</h2>
      <p>
        To the extent permitted by law, {SITE.operatorName} is not liable for
        indirect or consequential losses, or for loss of data, arising from
        your use of Toolora. Nothing in these terms limits liability that cannot
        legally be limited.
      </p>

      <h2>7. Changes to the service and terms</h2>
      <p>
        We may add, change or remove tools. We may update these terms, and the
        date at the top will change when we do. Continuing to use Toolora after
        an update means you accept the new terms.
      </p>

      <h2>8. Governing law</h2>
      <p>
        These terms are governed by {SITE.governingLaw}. Questions can be sent
        through the <Link href="/contact">contact page</Link>.
      </p>
    </PageShell>
  );
}
