import { NarrivaTheme } from "@/components/theme";
import { SubmissionForm } from "@/components/narriva/submission-form";

export default function SubmitPage() {
  return (
    <NarrivaTheme>
      <main>
        <div className="mx-auto grid max-w-[1080px] gap-[72px] px-8 py-16 lg:grid-cols-[0.82fr_1.18fr]">
          {/* Left context — sticky on desktop, stays mounted across both the
              form and the post-submit confirmation state. */}
          <div className="lg:sticky lg:top-[106px] lg:self-start">
            <div className="mb-[26px] h-px w-9 bg-[var(--color-accent)]" />
            <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium leading-[1.08] tracking-[-0.02em] text-[var(--color-ink)] sm:text-[46px]">
              Tell us about your book.
            </h1>
            <p className="mt-[22px] text-[16.5px] leading-[1.65] text-[var(--color-muted)]">
              We read every submission personally. Fill this in honestly — the more you
              tell us about where your manuscript is and what it needs, the better we can
              help.
            </p>
            <div className="mt-8 border-t border-[var(--color-ink)]/10 pt-7">
              <p className="text-sm leading-[1.6] text-[var(--color-muted-2)]">
                Most authors hear back from us within{" "}
                <span className="font-medium text-[var(--color-ink)]">1 – 3 business days</span>{" "}
                with an assessment and a proposed plan.
              </p>
            </div>
          </div>

          <SubmissionForm />
        </div>
      </main>
    </NarrivaTheme>
  );
}
