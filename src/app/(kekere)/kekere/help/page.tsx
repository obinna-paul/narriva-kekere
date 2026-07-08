import Link from "next/link";
import { HELP_CATEGORIES } from "@/content/kekere-help-faqs";
import { KekereHelpTabs } from "@/components/kekere/kekere-help-tabs";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/seo/schema";

export const metadata = {
  title: "Help",
  description: "Answers to common questions about reading, writing, and cowries on Kekere Stories.",
  alternates: { canonical: "/kekere/help" },
};

export default function KekereHelpPage() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-ink)]">
      <JsonLd data={faqPageSchema(HELP_CATEGORIES)} />
      <div className="px-[22px] pt-[18px]">
        <Link href="/kekere/feed" className="text-xl text-[var(--color-ink-muted)]" aria-label="Back to feed">
          ←
        </Link>
      </div>

      <header className="px-[22px] pb-[22px] pt-[18px] text-center">
        <h1 className="font-[family-name:var(--font-display)] text-[32px] font-semibold text-[var(--color-ink)]">
          How can we help?
        </h1>
        <p className="mt-[10px] text-[14.5px] text-[var(--color-ink-muted)]">
          Ask us anything. We&apos;re friendly, promise.
        </p>
      </header>

      <KekereHelpTabs categories={HELP_CATEGORIES} />
    </main>
  );
}
