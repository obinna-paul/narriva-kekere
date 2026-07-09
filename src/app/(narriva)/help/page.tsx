import { NarrivaTheme } from "@/components/theme";
import { HelpTabs } from "@/components/narriva/help-tabs";
import { HELP_CATEGORIES } from "@/content/narriva-help-faqs";
import { JsonLd } from "@/components/seo/json-ld";
import { faqPageSchema } from "@/lib/seo/schema";

export const metadata = {
  title: "Help Center",
  description: "Answers to common questions about submitting a manuscript, working with Narriva, and more.",
  alternates: { canonical: "/help" },
};

export default function HelpPage() {
  return (
    <NarrivaTheme>
      <JsonLd data={faqPageSchema(HELP_CATEGORIES)} />
      <main>
        <header className="mx-auto max-w-[760px] px-8 pb-10 pt-20 text-center">
          <div className="mb-4 text-xs font-medium uppercase tracking-[0.2em] text-[var(--color-accent-text)]">
            Help center
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-medium tracking-[-0.02em] text-[var(--color-ink)]">
            How can we help?
          </h1>
        </header>

        <div className="mx-auto max-w-[760px] px-8 pb-2">
          <HelpTabs categories={HELP_CATEGORIES} />
        </div>

        <section className="mx-auto max-w-[760px] px-8 pb-[110px] pt-12">
          <div className="rounded-lg bg-[var(--color-bg-alt)] p-9 text-center">
            <p className="text-base text-[#2A2620]">
              Still stuck?{" "}
              <a
                href="/contact"
                className="border-b border-[var(--color-primary)]/30 text-[var(--color-primary)]"
              >
                Get in touch
              </a>{" "}
              and a real person will help.
            </p>
          </div>
        </section>
      </main>
    </NarrivaTheme>
  );
}
