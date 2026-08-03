import Link from "next/link";
import { LifeBuoy, Mail, Wrench, HelpCircle } from "lucide-react";
import { HELP_CATEGORIES } from "@/content/kekere-help-faqs";
import { KekereHelpTabs } from "@/components/kekere/kekere-help-tabs";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/seo/schema";

const SUPPORT_EMAIL = "support@narriva.pro";

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

      <section className="mx-auto max-w-[680px] px-[22px] pb-[90px]">
        <div className="rounded-[22px] border border-[rgba(42,26,18,0.1)] bg-white p-[26px] shadow-[0_1px_3px_rgba(42,26,18,0.05)]">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[rgba(199,93,44,0.1)] text-[var(--color-primary)]">
              <LifeBuoy size={20} />
            </span>
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-[20px] font-semibold text-[var(--color-ink)]">
                Still need a hand?
              </h2>
              <p className="text-[13.5px] text-[var(--color-ink-muted)]">
                Reach out any time and we&apos;ll help you sort it out.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[14px] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 text-[var(--color-ink)]">
                <Wrench size={15} className="flex-none text-[var(--color-primary)]" />
                <span className="text-[14px] font-semibold">Something isn&apos;t working</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--color-ink-muted)]">
                A payment that didn&apos;t land, a page that won&apos;t load, a story that won&apos;t open — tell us what happened and we&apos;ll fix it.
              </p>
            </div>
            <div className="rounded-[14px] bg-[var(--color-bg)] p-4">
              <div className="flex items-center gap-2 text-[var(--color-ink)]">
                <HelpCircle size={15} className="flex-none text-[var(--color-primary)]" />
                <span className="text-[14px] font-semibold">Confused about something</span>
              </div>
              <p className="mt-1.5 text-[13px] leading-[1.55] text-[var(--color-ink-muted)]">
                Cowries, unlocking stories, competitions, your wallet — if anything&apos;s unclear, ask and we&apos;ll walk you through it.
              </p>
            </div>
          </div>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Kekere support")}`}
            className="mt-5 flex items-center justify-center gap-2 rounded-[14px] bg-[var(--color-primary)] px-5 py-[15px] text-[15px] font-semibold text-white transition-colors hover:bg-[var(--color-primary-light)]"
          >
            <Mail size={17} />
            Email {SUPPORT_EMAIL}
          </a>
          <p className="mt-3 text-center text-[12.5px] leading-[1.5] text-[var(--color-ink-muted)]">
            We usually reply within a day. Include the email on your account and a screenshot if you have one — it helps us help you faster.
          </p>
        </div>
      </section>
    </main>
  );
}
