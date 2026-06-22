import { Heading, Body } from "@/components/ui/typography";

export interface ProcessStep {
  title: string;
  description: string;
}

export interface ProcessFlowProps {
  steps: readonly ProcessStep[];
}

/**
 * Numbered step flow with a connecting line — horizontal on md+, a vertical
 * stepper on mobile. Both layouts render; Tailwind's display toggle keeps
 * only one visible (and the other is `display:none`, so it's invisible to
 * assistive tech too — no duplicate announcements).
 */
export function ProcessFlow({ steps }: ProcessFlowProps) {
  return (
    <>
      {/* Mobile: vertical stepper */}
      <ol className="flex flex-col gap-8 md:hidden">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-4 pl-1">
            {i < steps.length - 1 && (
              <span
                aria-hidden="true"
                className="absolute left-[19px] top-10 h-[calc(100%+1rem)] w-px bg-[var(--color-ink)]/15"
              />
            )}
            <span
              aria-hidden="true"
              className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-bg)] font-[family-name:var(--font-display)] font-semibold text-[var(--color-primary)]"
            >
              {i + 1}
            </span>
            <div className="pt-1.5">
              <Heading as="h3" size="h4">
                {step.title}
              </Heading>
              <Body size="sm" className="mt-1 text-[var(--color-ink)]/70">
                {step.description}
              </Body>
            </div>
          </li>
        ))}
      </ol>

      {/* Desktop: horizontal flow */}
      <ol className="relative hidden grid-cols-6 gap-4 md:grid">
        <span
          aria-hidden="true"
          className="absolute left-[8.33%] right-[8.33%] top-5 h-px bg-[var(--color-ink)]/15"
        />
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex flex-col items-center text-center">
            <span
              aria-hidden="true"
              className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--color-primary)] bg-[var(--color-bg)] font-[family-name:var(--font-display)] font-semibold text-[var(--color-primary)]"
            >
              {i + 1}
            </span>
            <Heading as="h3" size="h4" className="mt-4">
              {step.title}
            </Heading>
            <Body size="sm" className="mt-1 text-[var(--color-ink)]/70">
              {step.description}
            </Body>
          </li>
        ))}
      </ol>
    </>
  );
}
