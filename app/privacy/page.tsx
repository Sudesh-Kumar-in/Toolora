import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/page-shell";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Toolora handles your files, text and contact messages.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageShell
      title="Privacy policy"
      meta={`Last updated ${SITE.lastUpdated}`}
      intro="Toolora is designed so that most of what you do never leaves your device. This page explains exactly what happens to your data."
    >
      <h2>1. Files and text you process</h2>
      <p>
        The image, PDF, QR code, word counter, calculator and password tools
        run in your web browser. The files and text you choose are read and
        written on your device. Toolora does not upload them to our servers,
        does not store them, and cannot see them.
      </p>
      <p>
        Results remain in your browser until you download them or close the
        page. Closing the tab clears them.
      </p>

      <h2>2. Contact messages</h2>
      <p>
        The contact form does not send messages through Toolora. It opens your
        email app with your message filled in, and you choose whether to send
        it. Your message then travels through your email provider and ours.
        Please do not include sensitive personal information.
      </p>

      <h2>3. Technical data</h2>
      <p>
        Our hosting provider may keep standard server logs, such as IP address,
        browser type and the pages requested, for security and reliability.
        These logs are handled under the hosting provider&apos;s own policy.
      </p>
      <p>
        Toolora does not currently use analytics tools, advertising trackers or
        accounts, and does not set its own cookies. Fonts are served from our
        own domain.
      </p>

      <h2>4. Your choices</h2>
      <ul>
        <li>You can use every browser-based tool without giving us any personal information.</li>
        <li>You can ask us about any contact messages you have sent by writing to us at the address on the contact page.</li>
      </ul>

      <h2>5. Who we are</h2>
      <p>
        Toolora is operated by {SITE.operatorName}. Questions about this policy
        can be sent through the <Link href="/contact">contact page</Link>.
      </p>

      <h2>6. Changes</h2>
      <p>
        If we change how Toolora handles data, we will update this page and the
        date at the top. Significant changes will be made before they take
        effect.
      </p>
    </PageShell>
  );
}
